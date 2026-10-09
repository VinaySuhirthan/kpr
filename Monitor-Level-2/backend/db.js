import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from backend/.env
const envPath = path.join(__dirname, '.env')
const envResult = dotenv.config({ path: envPath, override: true })

if (envResult.error) {
  throw new Error(`Could not load backend environment file at ${envPath}: ${envResult.error.message}`)
}

function requiredEnv(name) {
  const value = process.env[name]
  if (!value?.trim()) {
    throw new Error(`Missing required setting ${name} in backend/.env`)
  }
  return value.trim()
}

function positiveIntegerEnv(name, fallback) {
  const value = process.env[name]
  if (value === undefined || value.trim() === '') {
    if (fallback !== undefined) return fallback
    throw new Error(`Missing required setting ${name} in backend/.env`)
  }

  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer in backend/.env`)
  }
  return parsed
}

const { Pool } = pg
export const databaseName = requiredEnv('PG_DATABASE')

export const pool = new Pool({
  host: requiredEnv('PG_HOST'),
  port: positiveIntegerEnv('PG_PORT'),
  database: databaseName,
  user: requiredEnv('PG_USER'),
  password: requiredEnv('PG_PASSWORD'),
  max: positiveIntegerEnv('PG_MAX_CONNECTIONS', 20),
  idleTimeoutMillis: positiveIntegerEnv('PG_IDLE_TIMEOUT_MS', 30000),
  connectionTimeoutMillis: positiveIntegerEnv('PG_CONNECTION_TIMEOUT_MS', 3000),
})

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected error on idle client:', err.message)
})

// Auto-initialize schema if tables do not exist
export async function initializeDatabase() {
  const client = await pool.connect()
  try {
    console.log(`[PostgreSQL] Connected to database: ${databaseName}`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS upload_batches (
        id SERIAL PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        period_label VARCHAR(100),
        total_rows INTEGER DEFAULT 0,
        valid_records INTEGER DEFAULT 0,
        start_date DATE,
        end_date DATE,
        uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS amr_isolates (
        id BIGSERIAL PRIMARY KEY,
        batch_id INTEGER REFERENCES upload_batches(id) ON DELETE CASCADE,
        sample_date DATE NOT NULL,
        organism VARCHAR(150) NOT NULL,
        antibiotic VARCHAR(100) NOT NULL,
        ward VARCHAR(100) NOT NULL,
        ast_result CHAR(1) NOT NULL CHECK (ast_result IN ('R', 'S', 'I')),
        patient_id VARCHAR(100),
        specimen_type VARCHAR(100),
        mic_value VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_amr_combination 
        ON amr_isolates (organism, antibiotic, ward);

      CREATE INDEX IF NOT EXISTS idx_amr_sample_date 
        ON amr_isolates (sample_date);

      CREATE INDEX IF NOT EXISTS idx_amr_ast_result 
        ON amr_isolates (ast_result);

      CREATE INDEX IF NOT EXISTS idx_amr_batch_id 
        ON amr_isolates (batch_id);

      CREATE OR REPLACE VIEW v_amr_monthly_trends AS
      SELECT 
        TO_CHAR(sample_date, 'YYYY-MM') AS month_year,
        organism,
        antibiotic,
        ward,
        COUNT(*) AS total_tested,
        COUNT(*) FILTER (WHERE ast_result = 'R') AS resistant_count,
        COUNT(*) FILTER (WHERE ast_result = 'S') AS susceptible_count,
        COUNT(*) FILTER (WHERE ast_result = 'I') AS intermediate_count,
        ROUND(
          (COUNT(*) FILTER (WHERE ast_result = 'R')::NUMERIC / 
           NULLIF(COUNT(*) FILTER (WHERE ast_result IN ('R', 'S')), 0)) * 100, 
          2
        ) AS resistance_rate_pct
      FROM amr_isolates
      GROUP BY TO_CHAR(sample_date, 'YYYY-MM'), organism, antibiotic, ward;
    `)

    console.log('[PostgreSQL] Database schema & tables verified successfully.')
  } catch (err) {
    console.error('[PostgreSQL] Schema initialization warning:', err.message)
    throw err
  } finally {
    client.release()
  }
}
