import express from 'express'
import cors from 'cors'
import { pool, initializeDatabase, databaseName } from './db.js'

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

const apiRouter = express.Router()

// Health check & DB Status
apiRouter.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as server_time, current_database() as database_name')
    res.json({
      status: 'healthy',
      database: result.rows[0].database_name,
      serverTime: result.rows[0].server_time,
    })
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
    })
  }
})

// GET /api/batches - List all uploaded dataset batches
apiRouter.get('/batches', async (req, res) => {
  try {
    const query = `
      SELECT 
        b.id,
        b.file_name,
        b.period_label,
        b.total_rows,
        b.valid_records,
        b.start_date,
        b.end_date,
        b.uploaded_at,
        COUNT(i.id) as stored_records_count
      FROM upload_batches b
      LEFT JOIN amr_isolates i ON b.id = i.batch_id
      GROUP BY b.id
      ORDER BY b.uploaded_at ASC
    `
    const result = await pool.query(query)
    res.json(result.rows)
  } catch (err) {
    console.error('[API] Error fetching batches:', err)
    res.status(500).json({ error: 'Failed to fetch batches', details: err.message })
  }
})

// GET /api/isolates - Fetch isolates with optional filters
apiRouter.get('/isolates', async (req, res) => {
  try {
    const { batchId, organism, antibiotic, ward, astResult, limit } = req.query
    const conditions = []
    const params = []

    if (batchId) {
      params.push(parseInt(batchId, 10))
      conditions.push(`batch_id = $${params.length}`)
    }
    if (organism) {
      params.push(organism)
      conditions.push(`organism ILIKE $${params.length}`)
    }
    if (antibiotic) {
      params.push(antibiotic)
      conditions.push(`antibiotic ILIKE $${params.length}`)
    }
    if (ward) {
      params.push(ward)
      conditions.push(`ward ILIKE $${params.length}`)
    }
    if (astResult) {
      params.push(astResult.toUpperCase())
      conditions.push(`ast_result = $${params.length}`)
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const limitClause = limit ? `LIMIT ${parseInt(limit, 10)}` : ''

    const query = `
      SELECT 
        id,
        batch_id,
        TO_CHAR(sample_date, 'YYYY-MM-DD') as date,
        organism,
        antibiotic,
        ward,
        ast_result,
        patient_id,
        specimen_type,
        mic_value,
        created_at
      FROM amr_isolates
      ${whereClause}
      ORDER BY sample_date ASC, id ASC
      ${limitClause}
    `
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    console.error('[API] Error fetching isolates:', err)
    res.status(500).json({ error: 'Failed to fetch isolates', details: err.message })
  }
})

// POST /api/upload - Ingest CSV records and save batch & isolates into PostgreSQL
apiRouter.post('/upload', async (req, res) => {
  let client
  let transactionStarted = false
  try {
    const { fileName, periodLabel, rows } = req.body

    if (typeof fileName !== 'string' || !fileName.trim() || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Invalid payload: fileName and non-empty rows array required.' })
    }

    const invalidRowIndex = rows.findIndex((row) => {
      if (!row || typeof row !== 'object') return true
      const hasRequiredValues = ['organism', 'antibiotic', 'ward'].every(
        (field) => typeof row[field] === 'string' && row[field].trim()
      )
      const date = new Date(row.date)
      return (
        !hasRequiredValues ||
        Number.isNaN(date.getTime()) ||
        !['R', 'S', 'I'].includes(String(row.ast_result).toUpperCase())
      )
    })

    if (invalidRowIndex !== -1) {
      return res.status(400).json({
        error: `Invalid isolate data at row ${invalidRowIndex + 1}. Each row requires a valid date, organism, antibiotic, ward, and R/S/I AST result.`,
      })
    }

    client = await pool.connect()
    await client.query('BEGIN')
    transactionStarted = true

    // Find date range
    const validDates = rows
      .map((r) => new Date(r.date))
      .filter((d) => !Number.isNaN(d.getTime()))

    const startDate = validDates.length
      ? new Date(Math.min(...validDates)).toISOString().slice(0, 10)
      : null
    const endDate = validDates.length
      ? new Date(Math.max(...validDates)).toISOString().slice(0, 10)
      : null

    // 1. Insert Batch record
    const batchInsertQuery = `
      INSERT INTO upload_batches (file_name, period_label, total_rows, valid_records, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, file_name, period_label, uploaded_at
    `
    const batchResult = await client.query(batchInsertQuery, [
      fileName,
      periodLabel || fileName.replace(/\.[^/.]+$/, ''),
      rows.length,
      rows.length,
      startDate,
      endDate,
    ])

    const batchId = batchResult.rows[0].id

    // 2. Batch-insert isolates in chunks
    const CHUNK_SIZE = 500
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE)
      const values = []
      const placeholders = []

      chunk.forEach((row, rowIndex) => {
        const offset = rowIndex * 9
        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
        )
        values.push(
          batchId,
          row.date,
          row.organism,
          row.antibiotic,
          row.ward,
          String(row.ast_result).toUpperCase(),
          row.patient_id || null,
          row.specimen_type || null,
          row.mic_value || null,
        )
      })

      const insertChunkQuery = `
        INSERT INTO amr_isolates (
          batch_id, sample_date, organism, antibiotic, ward, ast_result, patient_id, specimen_type, mic_value
        )
        VALUES ${placeholders.join(', ')}
      `
      await client.query(insertChunkQuery, values)
    }

    await client.query('COMMIT')
    transactionStarted = false

    console.log(`[API] Saved batch #${batchId} (${fileName}) with ${rows.length} isolates to PostgreSQL.`)

    res.status(201).json({
      success: true,
      message: `Successfully ingested ${rows.length} records into PostgreSQL.`,
      batch: batchResult.rows[0],
      savedCount: rows.length,
    })
  } catch (err) {
    if (transactionStarted) {
      await client.query('ROLLBACK')
    }
    console.error('[API] Error during upload ingestion:', err)
    res.status(500).json({ error: 'Failed to save dataset into PostgreSQL', details: err.message })
  } finally {
    if (client) client.release()
  }
})

// DELETE /api/batches/:id - Remove a specific batch
apiRouter.delete('/batches/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query('DELETE FROM upload_batches WHERE id = $1 RETURNING id, file_name', [id])
    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Batch not found' })
    }
    res.json({ success: true, message: `Deleted batch #${id} and associated isolates.` })
  } catch (err) {
    console.error('[API] Error deleting batch:', err)
    res.status(500).json({ error: 'Failed to delete batch', details: err.message })
  }
})

// DELETE /api/reset - Clear all surveillance data
apiRouter.delete('/reset', async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE upload_batches, amr_isolates CASCADE')
    res.json({ success: true, message: 'All surveillance datasets and isolates cleared.' })
  } catch (err) {
    console.error('[API] Error resetting database:', err)
    res.status(500).json({ error: 'Failed to reset database', details: err.message })
  }
})

app.use('/api/level2', apiRouter)
app.use('/api', apiRouter)

// Start server and initialize DB tables
async function startServer() {
  try {
    await initializeDatabase()
  } catch (err) {
    console.error('[PostgreSQL] Database initialization failed; server was not started:', err.message)
    process.exitCode = 1
    return
  }

  app.listen(PORT, () => {
    console.log(`\n==================================================`)
    console.log(`🚀 AMR Surveillance Backend running on http://localhost:${PORT}`)
    console.log(`💾 Connected to PostgreSQL database: ${databaseName}`)
    console.log(`==================================================\n`)
  })
}

startServer()
