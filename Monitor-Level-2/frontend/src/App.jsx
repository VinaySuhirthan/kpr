import { useCallback, useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import ReportModal from './ReportModal'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

async function requestApi(path, options) {
  const response = await fetch(`${API_BASE_URL}/api${path}`, options)
  const responseText = await response.text()
  let data = {}

  if (responseText) {
    try {
      data = JSON.parse(responseText)
    } catch {
      data = { error: responseText }
    }
  }

  if (!response.ok) {
    const fallback = response.status === 502
      ? 'The API server is unavailable. Start the backend and try again.'
      : `Request failed (${response.status})`
    throw new Error(data.details || data.error || fallback)
  }

  if (!responseText || typeof data !== 'object' || data === null) {
    throw new Error('The API returned an invalid response.')
  }

  return data
}

const MIN_SAMPLE = 10
const TREND_THRESHOLD = 2
const ALERT_THRESHOLD = 10

function cleanRows(rows) {
  const seen = new Set()

  return rows
    .map((row) => {
      const cleaned = {}

      Object.keys(row).forEach((key) => {
        cleaned[key.trim()] =
          typeof row[key] === 'string'
            ? row[key].trim().replace(/\s+/g, ' ')
            : row[key]
      })

      return cleaned
    })
    .filter((row) => {
      const key = JSON.stringify(row)

      if (seen.has(key)) return false

      seen.add(key)
      return true
    })
    .filter(
      (row) =>
        row.organism &&
        row.antibiotic &&
        row.ward &&
        row.ast_result &&
        row.date
    )
}

function normalizeAST(value) {
  if (!value) return null

  const result = value.toString().trim().toUpperCase()

  if (result === 'R' || result === 'RESISTANT') return 'R'
  if (result === 'S' || result === 'SUSCEPTIBLE') return 'S'
  if (result === 'I' || result === 'INTERMEDIATE') return 'I'

  return null
}

function calculateMetrics(rows) {
  const cleaned = cleanRows(rows)

  const records = cleaned
    .map((row) => ({
      ...row,
      ast_result: normalizeAST(row.ast_result),
      date: new Date(row.date),
    }))
    .filter(
      (row) =>
        !Number.isNaN(row.date.getTime()) &&
        ['R', 'S', 'I'].includes(row.ast_result)
    )

  const srRecords = records.filter((row) =>
    ['R', 'S'].includes(row.ast_result)
  )

  const total = records.length
  const resistant = records.filter((r) => r.ast_result === 'R').length
  const susceptible = records.filter((r) => r.ast_result === 'S').length
  const intermediate = records.filter((r) => r.ast_result === 'I').length

  const resistanceRate =
    resistant + susceptible > 0
      ? (resistant / (resistant + susceptible)) * 100
      : 0

  const startDate =
    records.length > 0
      ? new Date(Math.min(...records.map((r) => r.date.getTime())))
      : null

  const endDate =
    records.length > 0
      ? new Date(Math.max(...records.map((r) => r.date.getTime())))
      : null

  const months = [...new Set(
    srRecords.map((row) => {
      const year = row.date.getFullYear()
      const month = String(row.date.getMonth() + 1).padStart(2, '0')
      return `${year}-${month}`
    })
  )].sort()

  const monthlyMap = {}

  srRecords.forEach((row) => {
    const year = row.date.getFullYear()
    const month = String(row.date.getMonth() + 1).padStart(2, '0')
    const key = `${year}-${month}`

    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        month: key,
        total: 0,
        resistant: 0,
        susceptible: 0,
      }
    }

    monthlyMap[key].total += 1

    if (row.ast_result === 'R') {
      monthlyMap[key].resistant += 1
    } else {
      monthlyMap[key].susceptible += 1
    }
  })

  const monthly = Object.values(monthlyMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((item) => ({
      ...item,
      resistanceRate:
        item.total > 0 ? (item.resistant / item.total) * 100 : 0,
    }))

  return {
    records,
    srRecords,
    total,
    resistant,
    susceptible,
    intermediate,
    resistanceRate,
    startDate,
    endDate,
    monthly,
    months,
  }
}

function groupAnalysis(rows, fields) {
  const groups = {}

  rows.forEach((row) => {
    const key = fields.map((field) => row[field]).join('|||')

    if (!groups[key]) {
      groups[key] = {
        key,
        values: {},
        total: 0,
        resistant: 0,
        susceptible: 0,
      }

      fields.forEach((field) => {
        groups[key].values[field] = row[field]
      })
    }

    groups[key].total += 1

    if (row.ast_result === 'R') {
      groups[key].resistant += 1
    } else if (row.ast_result === 'S') {
      groups[key].susceptible += 1
    }
  })

  return Object.values(groups)
    .filter((group) => group.total > 0)
    .map((group) => ({
      ...group.values,
      total: group.total,
      resistant: group.resistant,
      susceptible: group.susceptible,
      resistanceRate:
        group.resistant + group.susceptible > 0
          ? (group.resistant /
              (group.resistant + group.susceptible)) *
            100
          : 0,
    }))
}

function calculateSlope(monthly) {
  if (monthly.length < 2) return 0

  const points = monthly.map((item, index) => ({
    x: index,
    y: item.resistanceRate,
  }))

  const xMean =
    points.reduce((sum, point) => sum + point.x, 0) / points.length

  const yMean =
    points.reduce((sum, point) => sum + point.y, 0) / points.length

  let numerator = 0
  let denominator = 0

  points.forEach((point) => {
    numerator += (point.x - xMean) * (point.y - yMean)
    denominator += (point.x - xMean) ** 2
  })

  return denominator === 0 ? 0 : numerator / denominator
}

function getTrendStatus(slope) {
  if (slope >= TREND_THRESHOLD) return 'Increasing'
  if (slope <= -TREND_THRESHOLD) return 'Decreasing'
  return 'Stable'
}

function analyzeCombination(rows, fields) {
  const grouped = groupAnalysis(
    rows.filter((row) => ['R', 'S'].includes(row.ast_result)),
    fields
  )

  return grouped.map((group) => {
    const matchingRows = rows.filter((row) =>
      fields.every((field) => row[field] === group[field])
    )

    const monthlyMap = {}

    matchingRows
      .filter((row) => ['R', 'S'].includes(row.ast_result))
      .forEach((row) => {
        const year = row.date.getFullYear()
        const month = String(row.date.getMonth() + 1).padStart(2, '0')
        const key = `${year}-${month}`

        if (!monthlyMap[key]) {
          monthlyMap[key] = {
            month: key,
            total: 0,
            resistant: 0,
          }
        }

        monthlyMap[key].total += 1

        if (row.ast_result === 'R') {
          monthlyMap[key].resistant += 1
        }
      })

    const monthly = Object.values(monthlyMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((item) => ({
        ...item,
        resistanceRate:
          item.total > 0
            ? (item.resistant / item.total) * 100
            : 0,
      }))

    const slope = calculateSlope(monthly)

    return {
      ...group,
      trendSlope: slope,
      trendStatus: getTrendStatus(slope),
      monthly,
    }
  })
}

function summarizeResistance(rows) {
  const interpretable = rows.filter((row) => ['R', 'S'].includes(row.ast_result))
  if (!interpretable.length) {
    return { rate: null, resistant: 0, tested: 0 }
  }

  const resistant = interpretable.filter((row) => row.ast_result === 'R').length
  return {
    rate: (resistant / interpretable.length) * 100,
    resistant,
    tested: interpretable.length,
  }
}

function calculateMonthlyTrend(rows) {
  const monthlyCounts = new Map()

  rows.forEach((row) => {
    if (!['R', 'S'].includes(row.ast_result)) return
    const date = row.date instanceof Date ? row.date : new Date(row.date)
    if (Number.isNaN(date.getTime())) return

    const monthIndex = date.getFullYear() * 12 + date.getMonth()
    const month = monthlyCounts.get(monthIndex) || { resistant: 0, tested: 0 }
    month.tested += 1
    if (row.ast_result === 'R') month.resistant += 1
    monthlyCounts.set(monthIndex, month)
  })

  const monthly = [...monthlyCounts.entries()]
    .sort(([monthA], [monthB]) => monthA - monthB)
    .map(([monthIndex, counts]) => ({
      monthIndex,
      resistanceRate: (counts.resistant / counts.tested) * 100,
    }))

  if (!monthly.length) {
    return { slope: null, forecastRate: null, monthsObserved: 0 }
  }

  const xMean = monthly.reduce((sum, point) => sum + point.monthIndex, 0) / monthly.length
  const yMean = monthly.reduce((sum, point) => sum + point.resistanceRate, 0) / monthly.length
  const denominator = monthly.reduce(
    (sum, point) => sum + (point.monthIndex - xMean) ** 2,
    0
  )
  const slope = denominator
    ? monthly.reduce(
        (sum, point) =>
          sum + (point.monthIndex - xMean) * (point.resistanceRate - yMean),
        0
      ) / denominator
    : null
  const latestRate = monthly[monthly.length - 1].resistanceRate

  return {
    slope,
    forecastRate: slope === null ? null : Math.max(0, Math.min(100, latestRate + slope * 3)),
    monthsObserved: monthly.length,
  }
}

function assessAntibioticRisk(organismRows, antibiotic, ward) {
  const organismDrugRows = organismRows.filter(
    (row) => row.antibiotic === antibiotic
  )
  const wardRows = organismDrugRows.filter((row) => row.ward === ward)
  const overall = summarizeResistance(organismDrugRows)
  const wardSpecific = summarizeResistance(wardRows)
  const trend = calculateMonthlyTrend(organismDrugRows)

  if (overall.rate === null || wardSpecific.rate === null) return null

  const forecastRate = trend.forecastRate ?? overall.rate
  return {
    antibiotic,
    currentResistance: overall.rate,
    overallTested: overall.tested,
    wardResistance: wardSpecific.rate,
    wardTested: wardSpecific.tested,
    trendSlope: trend.slope,
    monthsObserved: trend.monthsObserved,
    forecastRate,
    riskScore: overall.rate * 0.45 + wardSpecific.rate * 0.3 + forecastRate * 0.25,
  }
}

function buildRecommendations(alerts, currentRows) {
  return alerts.map((alert) => {
    const organismRows = currentRows.filter((row) => row.organism === alert.organism)
    const currentRisk = assessAntibioticRisk(
      organismRows,
      alert.antibiotic,
      alert.ward
    )
    const organismAntibiotics = [...new Set(
      organismRows
        .map((row) => row.antibiotic)
        .filter((antibiotic) => antibiotic && antibiotic !== alert.antibiotic)
    )]

    const assessedAlternatives = organismAntibiotics
      .map((antibiotic) =>
        assessAntibioticRisk(organismRows, antibiotic, alert.ward)
      )
      .filter(
        (candidate) => candidate && candidate.wardTested >= MIN_SAMPLE
      )
    const lowerRiskAlternatives = assessedAlternatives
      .filter((candidate) => currentRisk && candidate.riskScore < currentRisk.riskScore)
      .sort((a, b) => a.riskScore - b.riskScore)

    const bestAlternative = lowerRiskAlternatives[0]
    const actions = []

    if (bestAlternative) {
      const reduction = currentRisk.riskScore - bestAlternative.riskScore
      actions.push(
        `Prioritize ${bestAlternative.antibiotic} for isolate-level susceptibility testing in ${alert.ward}: its ward resistance is ${bestAlternative.wardResistance.toFixed(1)}% versus ${currentRisk.wardResistance.toFixed(1)}% for ${alert.antibiotic}, with a ${bestAlternative.forecastRate.toFixed(1)}% three-month projected resistance rate (${reduction.toFixed(1)} pp lower composite risk).`
      )
    } else {
      if (currentRisk) {
        actions.push(
          `Among ${assessedAlternatives.length} other antibiotics with paired organism-wide and ${alert.ward} results, none scored below ${alert.antibiotic} (composite risk ${currentRisk.riskScore.toFixed(1)}). Keep decisions susceptibility-led and review again as ward results accumulate.`
        )
      } else {
        actions.push(
          `Only ${alert.total} ${alert.organism} ${alert.antibiotic} isolate records were available for ${alert.ward}; collect paired R/S results for this drug and alternatives before comparing ward-specific risks.`
        )
      }
    }

    if (currentRisk && currentRisk.trendSlope !== null && currentRisk.trendSlope > 0) {
      actions.push(
        `${alert.antibiotic} resistance for ${alert.organism} is trending upward by ${currentRisk.trendSlope.toFixed(1)} percentage points per month; review the next monthly results for further change.`
      )
    }

    if (
      currentRisk &&
      currentRisk.wardResistance > currentRisk.currentResistance
    ) {
      actions.push(
        `${alert.ward} is ${(
          currentRisk.wardResistance - currentRisk.currentResistance
        ).toFixed(1)} percentage points above the organism-wide ${alert.antibiotic} resistance rate; focus surveillance review on this ward.`
      )
    }

    return {
      ...alert,
      currentRisk,
      alternatives: lowerRiskAlternatives,
      actions,
    }
  })
}

function compareGroups(previousRows, currentRows, fields) {
  const previous = groupAnalysis(previousRows, fields)
  const current = groupAnalysis(currentRows, fields)

  const previousMap = new Map(
    previous.map((item) => [
      fields.map((field) => item[field]).join('|||'),
      item,
    ])
  )

  return current.map((item) => {
    const key = fields.map((field) => item[field]).join('|||')
    const old = previousMap.get(key)

    const previousRate = old ? old.resistanceRate : null

    const change =
      previousRate === null
        ? null
        : item.resistanceRate - previousRate

    let status = 'New'

    if (change !== null) {
      if (change >= 2) status = 'Increased'
      else if (change <= -2) status = 'Decreased'
      else status = 'Stable'
    }

    const alert =
      change !== null &&
      change >= ALERT_THRESHOLD &&
      item.total >= MIN_SAMPLE

    return {
      ...item,
      previousRate,
      change,
      status,
      alert,
    }
  })
}

function formatDate(date) {
  if (!date) return '-'

  return date.toLocaleDateString()
}

function App() {
  const [periods, setPeriods] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [uploadError, setUploadError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [selectedPeriodId, setSelectedPeriodId] = useState('all')
  const [comparePeriod1Id, setComparePeriod1Id] = useState('')
  const [comparePeriod2Id, setComparePeriod2Id] = useState('')
  const [showReport, setShowReport] = useState(false)

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [batches, rows] = await Promise.all([
        requestApi('/batches'),
        requestApi('/isolates'),
      ])
      const rowsByBatch = new Map()

      rows.forEach((row) => {
        const batchRows = rowsByBatch.get(row.batch_id) || []
        batchRows.push({
          ...row,
          date: row.date,
          ast_result: normalizeAST(row.ast_result),
        })
        rowsByBatch.set(row.batch_id, batchRows)
      })

      const loadedPeriods = batches.map((batch) => {
        const metrics = calculateMetrics(rowsByBatch.get(batch.id) || [])
        return {
          id: batch.id,
          name: batch.file_name,
          periodLabel: batch.period_label,
          rows: metrics.records,
          metrics,
        }
      })

      setPeriods(loadedPeriods)
      setUploadError('')
      return true
    } catch (err) {
      console.error('Could not load saved surveillance data:', err)
      setUploadError(`Could not load saved data from the database: ${err.message}`)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => loadDashboardData(), 0)
    return () => window.clearTimeout(timer)
  }, [loadDashboardData])

  const parseSingleFile = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const rows = cleanRows(results.data)
            if (!rows.length) {
              return reject(new Error(`No valid rows found in ${file.name}`))
            }
            const requiredColumns = [
              'organism',
              'date',
              'ward',
              'antibiotic',
              'ast_result',
            ]
            const missing = requiredColumns.filter((col) => !(col in rows[0]))
            if (missing.length) {
              return reject(
                new Error(
                  `${file.name} is missing required columns: ${missing.join(', ')}`
                )
              )
            }
            const metrics = calculateMetrics(rows)
            if (!metrics.records.length) {
              return reject(new Error(`No valid isolate records found in ${file.name}`))
            }
            resolve({
              name: file.name,
              rows: metrics.records,
              metrics,
            })
          } catch (err) {
            reject(err)
          }
        },
        error: (err) => reject(err),
      })
    })
  }

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    setUploadError('')
    setIsUploading(true)

    try {
      const parsedPeriods = await Promise.all(files.map(parseSingleFile))

      for (const period of parsedPeriods) {
        await requestApi('/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: period.name,
            periodLabel: period.name.replace(/\.[^/.]+$/, ''),
            rows: period.rows,
          }),
        })
      }

      await loadDashboardData()
      setSelectedPeriodId('all')
      setComparePeriod1Id('')
      setComparePeriod2Id('')
    } catch (err) {
      console.error(err)
      const uploadMessage = err.message || 'Could not upload one or more CSV files.'
      const dataLoaded = await loadDashboardData()
      setUploadError(
        dataLoaded
          ? uploadMessage
          : `${uploadMessage} Saved database records could not be reloaded.`
      )
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  // Unified connected dataset across ALL uploaded CSVs
  const combinedData = useMemo(() => {
    if (!periods.length) return null

    const allRawRows = periods.flatMap((p) => p.rows)
    const metrics = calculateMetrics(allRawRows)

    return {
      id: 'all',
      name: `All Datasets Combined (${periods.length} files)`,
      rows: metrics.records,
      metrics,
    }
  }, [periods])

  // Currently viewed period (either 'all' combined or a specific period)
  const activeViewPeriod = useMemo(() => {
    if (!periods.length) return null
    if (selectedPeriodId === 'all' && combinedData) return combinedData
    return periods.find((p) => p.id === selectedPeriodId) || combinedData || periods[0]
  }, [periods, selectedPeriodId, combinedData])

  // Global cross-cutting filters
  const [filterOrganism, setFilterOrganism] = useState('')
  const [filterAntibiotic, setFilterAntibiotic] = useState('')
  const [filterWard, setFilterWard] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const resetFilters = () => {
    setFilterOrganism('')
    setFilterAntibiotic('')
    setFilterWard('')
    setFilterMonth('')
    setSearchQuery('')
  }

  // Distinct categorical choices from the active period dataset
  const availableOrganisms = useMemo(() => {
    if (!activeViewPeriod) return []
    const counts = {}
    activeViewPeriod.rows.forEach((r) => {
      if (r.organism) counts[r.organism] = (counts[r.organism] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [activeViewPeriod])

  const availableAntibiotics = useMemo(() => {
    if (!activeViewPeriod) return []
    const counts = {}
    activeViewPeriod.rows.forEach((r) => {
      if (r.antibiotic) counts[r.antibiotic] = (counts[r.antibiotic] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [activeViewPeriod])

  const availableWards = useMemo(() => {
    if (!activeViewPeriod) return []
    const counts = {}
    activeViewPeriod.rows.forEach((r) => {
      if (r.ward) counts[r.ward] = (counts[r.ward] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [activeViewPeriod])

  const availableMonths = useMemo(() => {
    if (!activeViewPeriod) return []
    const months = new Set()
    activeViewPeriod.rows.forEach((r) => {
      if (r.date) {
        const d = r.date instanceof Date ? r.date : new Date(r.date)
        if (!Number.isNaN(d.getTime())) {
          months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
        }
      }
    })
    return [...months].sort()
  }, [activeViewPeriod])

  // Filtered rows for active view period
  const filteredActiveRows = useMemo(() => {
    if (!activeViewPeriod) return []

    return activeViewPeriod.rows.filter((row) => {
      if (filterOrganism && row.organism !== filterOrganism) return false
      if (filterAntibiotic && row.antibiotic !== filterAntibiotic) return false
      if (filterWard && row.ward !== filterWard) return false
      if (filterMonth) {
        const d = row.date instanceof Date ? row.date : new Date(row.date)
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (m !== filterMonth) return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const orgMatch = row.organism && row.organism.toLowerCase().includes(q)
        const antiMatch = row.antibiotic && row.antibiotic.toLowerCase().includes(q)
        const wardMatch = row.ward && row.ward.toLowerCase().includes(q)
        if (!orgMatch && !antiMatch && !wardMatch) return false
      }
      return true
    })
  }, [activeViewPeriod, filterOrganism, filterAntibiotic, filterWard, filterMonth, searchQuery])

  const isGlobalFilterActive = Boolean(
    filterOrganism || filterAntibiotic || filterWard || filterMonth || searchQuery.trim()
  )

  // Filtered dataset object passed into overview, trends, details
  const filteredActivePeriod = useMemo(() => {
    if (!activeViewPeriod) return null
    if (!isGlobalFilterActive) return activeViewPeriod

    const metrics = calculateMetrics(filteredActiveRows)
    return {
      ...activeViewPeriod,
      rows: filteredActiveRows,
      metrics,
      isFiltered: true,
      originalTotal: activeViewPeriod.metrics.total,
    }
  }, [activeViewPeriod, isGlobalFilterActive, filteredActiveRows])

  // Comparison periods for period-over-period diffing
  const periodA = useMemo(() => {
    if (comparePeriod1Id) {
      return periods.find((p) => p.id === comparePeriod1Id) || null
    }
    return periods.length >= 2 ? periods[periods.length - 2] : null
  }, [periods, comparePeriod1Id])

  const periodB = useMemo(() => {
    if (comparePeriod2Id) {
      return periods.find((p) => p.id === comparePeriod2Id) || null
    }
    return periods.length >= 1 ? periods[periods.length - 1] : null
  }, [periods, comparePeriod2Id])

  const comparison = useMemo(() => {
    if (!periodA || !periodB || periodA.id === periodB.id) return null

    return {
      overall: {
        previousRate: periodA.metrics.resistanceRate,
        currentRate: periodB.metrics.resistanceRate,
        change:
          periodB.metrics.resistanceRate -
          periodA.metrics.resistanceRate,
      },

      organism: compareGroups(
        periodA.rows,
        periodB.rows,
        ['organism']
      ),

      antibiotic: compareGroups(
        periodA.rows,
        periodB.rows,
        ['antibiotic']
      ),

      ward: compareGroups(
        periodA.rows,
        periodB.rows,
        ['ward']
      ),

      organismAntibiotic: compareGroups(
        periodA.rows,
        periodB.rows,
        ['organism', 'antibiotic']
      ),

      organismAntibioticWard: compareGroups(
        periodA.rows,
        periodB.rows,
        ['organism', 'antibiotic', 'ward']
      ),
    }
  }, [periodA, periodB])

  const trendResults = useMemo(() => {
    if (!filteredActivePeriod || !filteredActivePeriod.rows.length) return []

    return analyzeCombination(
      filteredActivePeriod.rows,
      ['organism', 'antibiotic', 'ward']
    )
  }, [filteredActivePeriod])

  const alerts = useMemo(
    () => comparison
      ? comparison.organismAntibioticWard.filter((item) => item.alert)
      : [],
    [comparison]
  )

  const recommendations = useMemo(
    () => buildRecommendations(alerts, periodB?.rows || []),
    [alerts, periodB]
  )

  const increasing = trendResults.filter(
    (item) => item.trendStatus === 'Increasing'
  )

  const dashboardSections = [
    { id: 'overview', label: 'Overview', description: 'Surveillance summary and key indicators' },
    { id: 'comparison', label: 'Period Comparison', description: 'Compare uploaded surveillance periods' },
    { id: 'trends', label: 'Trends', count: trendResults.length, description: 'Resistance trajectories over time' },
    { id: 'alerts', label: 'Alerts', count: alerts.length, description: 'Significant resistance increases' },
    { id: 'recommendations', label: 'Recommendations', count: recommendations.length, description: 'Data-ranked antibiotic alternatives' },
    { id: 'details', label: 'Detailed Analysis', description: 'Explore isolate-level results' },
  ]
  const activeSection = dashboardSections.find((section) => section.id === activeTab)

  const resetDashboard = async () => {
    setUploadError('')
    setIsResetting(true)
    try {
      await requestApi('/reset', { method: 'DELETE' })
      setPeriods([])
      setSelectedPeriodId('all')
      setComparePeriod1Id('')
      setComparePeriod2Id('')
      resetFilters()
    } catch (err) {
      console.error('Could not reset saved surveillance data:', err)
      setUploadError(`Could not reset database data: ${err.message}`)
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className={`app ${activeViewPeriod ? 'has-data' : 'is-landing'}`}>
      <header className={`header ${activeViewPeriod ? '' : 'header-landing'}`}>
        <div>
          <div className="brand-line">
            <div className="eyebrow">AMR SURVEILLANCE <span>—</span> DATA INTELLIGENCE</div>
          </div>
          <h1>Resistance <span>Trend Detection</span></h1>
          <p>
            Antimicrobial resistance monitoring, comparison and early warning.
          </p>
        </div>

        {activeViewPeriod && (
          <div className="header-actions">
            <label className="upload-button">
              {isUploading ? 'Uploading…' : '+ Upload CSV'}
              <input
                type="file"
                accept=".csv"
                onChange={handleUpload}
                disabled={isLoading || isUploading || isResetting}
                hidden
              />
            </label>

            <button className="report-button" onClick={() => setShowReport(true)}>
              Generate Report
            </button>

            <button className="reset-button" onClick={resetDashboard} disabled={isResetting || isUploading}>
              {isResetting ? 'Resetting…' : 'Reset'}
            </button>
          </div>
        )}
      </header>

      <main>
        {uploadError && (
          <div className="error-box">
            {uploadError}
          </div>
        )}

        {activeViewPeriod && <section className="surveillance-card">
          <div className="surveillance-summary">
            <div>
              <div className="eyebrow">
                {selectedPeriodId === 'all' ? 'CONNECTED DATASETS' : 'SELECTED PERIOD'}
              </div>
              <h2>{selectedPeriodId === 'all' ? 'All datasets' : activeViewPeriod.name}</h2>
              <p>
                {formatDate(activeViewPeriod.metrics.startDate)} —{' '}
                {formatDate(activeViewPeriod.metrics.endDate)}
              </p>
            </div>

            {comparison && (
              <div className="comparison-banner">
                <span className="comparison-label">Resistance change</span>
                <strong>{periodA?.name}</strong>
                <span className="comparison-separator">vs</span>
                <strong>{periodB?.name}</strong>
                <span
                  className={
                    comparison.overall.change > 0
                      ? 'positive'
                      : comparison.overall.change < 0
                      ? 'negative'
                      : ''
                  }
                >
                  {comparison.overall.change > 0 ? '↑' : ''}
                  {comparison.overall.change < 0 ? '↓' : ''}
                  {Math.abs(comparison.overall.change).toFixed(1)} pp
                </span>
              </div>
            )}
          </div>

          <div className="period-list" aria-label="Choose a dataset period">
            {periods.length > 1 && combinedData && (
              <button
                type="button"
                className={`period-chip ${selectedPeriodId === 'all' ? 'active-chip' : ''}`}
                aria-pressed={selectedPeriodId === 'all'}
                onClick={() => setSelectedPeriodId('all')}
              >
                <span>All periods</span>
                <strong>{periods.length} datasets</strong>
                <small>{combinedData.metrics.total.toLocaleString()} isolates</small>
              </button>
            )}

            {periods.map((period, index) => (
              <button
                type="button"
                className={`period-chip ${selectedPeriodId === period.id ? 'active-chip' : ''}`}
                key={period.id}
                aria-pressed={selectedPeriodId === period.id}
                onClick={() => setSelectedPeriodId(period.id)}
              >
                <span>Period {index + 1}</span>
                <strong>{period.name}</strong>
                <small>{period.metrics.total.toLocaleString()} isolates</small>
              </button>
            ))}
          </div>
        </section>}

        {!activeViewPeriod ? (
          isLoading
            ? <DashboardSkeleton />
            : <section className="landing-upload">
              <div className="landing-copy">
                <span className="landing-kicker">SURVEILLANCE STARTS HERE</span>
                <h2>Turn your data into<br /><span>clearer signals.</span></h2>
                <p>
                  Bring your antimicrobial susceptibility data together and uncover resistance patterns, emerging risks, and changes over time.
                </p>
                <div className="landing-highlights">
                  <span><i /> Resistance trends</span>
                  <span><i /> Ward-level signals</span>
                  <span><i /> Early warnings</span>
                </div>
              </div>

              <label className="landing-dropzone">
                <span className="upload-glyph" aria-hidden="true">
                  {isUploading ? <span className="upload-spinner" /> : 'CSV'}
                </span>
                <strong>{isUploading ? 'Analyzing your CSV…' : 'Choose a CSV file'}</strong>
                <span className="dropzone-hint">
                  {isUploading
                    ? 'Validating records and saving to your database'
                    : 'Select one dataset to open your surveillance dashboard'}
                </span>
                <span className="dropzone-button">
                  {isUploading ? 'Uploading…' : 'Choose CSV'}
                </span>
                <span className="dropzone-format">CSV format · Your data stays in your database</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleUpload}
                  disabled={isUploading || isResetting}
                  hidden
                />
              </label>
            </section>
        ) : (
          <>
            <div className="dashboard-enter" key={activeViewPeriod.id}>
            {/* Global Cross-Cutting Filter Bar */}
            <GlobalFilterBar
              organisms={availableOrganisms}
              antibiotics={availableAntibiotics}
              wards={availableWards}
              months={availableMonths}
              filterOrganism={filterOrganism}
              filterAntibiotic={filterAntibiotic}
              filterWard={filterWard}
              filterMonth={filterMonth}
              searchQuery={searchQuery}
              onOrganismChange={setFilterOrganism}
              onAntibioticChange={setFilterAntibiotic}
              onWardChange={setFilterWard}
              onMonthChange={setFilterMonth}
              onSearchChange={setSearchQuery}
              onResetFilters={resetFilters}
              totalRecords={activeViewPeriod.metrics.total}
              filteredRecordsCount={filteredActiveRows.length}
            />

            <div className="dashboard-sections">
            <nav className="tabs" aria-label="Dashboard sections">
              <div className="sidebar-heading">
                <span className="sidebar-kicker">WORKSPACE</span>
                <strong>Analysis sections</strong>
              </div>
              <div className="sidebar-links">
              {dashboardSections.map(({ id, label, count }, index) => (
                <button
                  key={id}
                  className={activeTab === id ? 'active' : ''}
                  aria-current={activeTab === id ? 'page' : undefined}
                  onClick={() => setActiveTab(id)}
                >
                  <span className="nav-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <span className="nav-label">{label}</span>
                  {count !== undefined && <span className="nav-count">{count}</span>}
                </button>
              ))}
              </div>
              <div className="sidebar-status">
                <span className="status-indicator" />
                <div>
                  <strong>{periods.length} dataset{periods.length === 1 ? '' : 's'} connected</strong>
                  <span>{combinedData?.metrics.total.toLocaleString() || 0} isolates analyzed</span>
                </div>
              </div>
            </nav>

            <div className="section-content section-transition" key={activeTab}>
            <header className="analysis-heading">
              <div>
                <span className="analysis-kicker">AMR SURVEILLANCE / {activeTab.toUpperCase()}</span>
                <h2>{activeSection?.label}</h2>
                <p>{activeSection?.description}</p>
              </div>
              <span className="analysis-period">
                <span className="status-indicator" />
                {selectedPeriodId === 'all' ? 'All connected periods' : activeViewPeriod.name}
              </span>
            </header>
            {activeTab === 'overview' && (
              <>
                {isGlobalFilterActive && (
                  <div className="active-slice-banner">
                    <div>
                      <strong>Active Filter Slice:</strong> Showing{' '}
                      <strong>{filteredActivePeriod.metrics.total.toLocaleString()}</strong> of{' '}
                      {activeViewPeriod.metrics.total.toLocaleString()} isolates
                      {filterOrganism && ` • ${filterOrganism}`}
                      {filterAntibiotic && ` • ${filterAntibiotic}`}
                      {filterWard && ` • ${filterWard}`}
                      {filterMonth && ` • Month ${filterMonth}`}
                      {searchQuery.trim() && ` • "${searchQuery}"`}
                    </div>
                    <button className="active-slice-clear" onClick={resetFilters}>
                      Clear Filters
                    </button>
                  </div>
                )}

                {filteredActivePeriod.metrics.total === 0 ? (
                  <section className="empty-state small" style={{ margin: '30px auto' }}>
                    <h2>No matching isolates found</h2>
                    <p>No isolate records match your currently selected filters. Broaden your search or reset filters.</p>
                    <button className="reset-button" onClick={resetFilters} style={{ marginTop: '12px' }}>
                      Reset Global Filters
                    </button>
                  </section>
                ) : (
                  <>
                    <section className="kpi-grid">
                      <KPI
                        label="Resistance Rate"
                        value={`${filteredActivePeriod.metrics.resistanceRate.toFixed(1)}%`}
                        sub={`${filteredActivePeriod.metrics.resistant.toLocaleString()} resistant`}
                      />

                      <KPI
                        label="Total Isolates"
                        value={filteredActivePeriod.metrics.total.toLocaleString()}
                        sub={`${filteredActivePeriod.metrics.srRecords.length.toLocaleString()} S/R interpretable`}
                      />

                      <KPI
                        label="Intermediate"
                        value={filteredActivePeriod.metrics.intermediate.toLocaleString()}
                        sub="Reported separately"
                      />

                      <KPI
                        label="Increasing Trends"
                        value={increasing.length}
                        sub="Organism + antibiotic + ward"
                      />

                      <KPI
                        label="Early Warnings"
                        value={alerts.length}
                        sub="≥10 percentage-point increase"
                        danger={alerts.length > 0}
                      />
                    </section>

                    <section className="two-column">
                      <Card title="Monthly Change in Resistance">
                        <MonthlyChangeChart data={filteredActivePeriod.metrics.monthly} />
                      </Card>

                      <Card title="Ward Resistance Comparison">
                        <WardComparison
                          current={filteredActivePeriod}
                          previous={periodA}
                        />
                      </Card>
                    </section>

                    <Card title="Current Dataset Snapshot">
                      <div className="stats-grid">
                        <Stat label="Resistant" value={filteredActivePeriod.metrics.resistant} />
                        <Stat label="Susceptible" value={filteredActivePeriod.metrics.susceptible} />
                        <Stat label="Intermediate" value={filteredActivePeriod.metrics.intermediate} />
                        <Stat
                          label="S/R resistance rate"
                          value={`${filteredActivePeriod.metrics.resistanceRate.toFixed(1)}%`}
                        />
                      </div>
                    </Card>
                  </>
                )}
              </>
            )}

            {activeTab === 'comparison' && (
              <ComparisonTab
                comparison={comparison}
                previous={periodA}
                current={periodB}
                periods={periods}
                comparePeriod1Id={comparePeriod1Id}
                comparePeriod2Id={comparePeriod2Id}
                setComparePeriod1Id={setComparePeriod1Id}
                setComparePeriod2Id={setComparePeriod2Id}
              />
            )}

            {activeTab === 'trends' && (
              <TrendsTab trendResults={trendResults} />
            )}

            {activeTab === 'alerts' && (
              <AlertsTab alerts={alerts} />
            )}

            {activeTab === 'recommendations' && (
              <RecommendationsTab recommendations={recommendations} />
            )}

            {activeTab === 'details' && (
              <DetailsTab
                current={filteredActivePeriod}
                comparison={comparison}
                filterOrganism={filterOrganism}
                filterAntibiotic={filterAntibiotic}
                filterWard={filterWard}
                onSelectOrganism={setFilterOrganism}
                onSelectAntibiotic={setFilterAntibiotic}
                onSelectWard={setFilterWard}
              />
            )}
            </div>
            </div>
            </div>
          </>
        )}
      </main>

      {showReport && (
        <ReportModal
          periods={periods}
          combinedData={combinedData}
          comparison={comparison}
          alerts={alerts}
          trendResults={trendResults}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  )
}

function GlobalFilterBar({
  organisms,
  antibiotics,
  wards,
  months,
  filterOrganism,
  filterAntibiotic,
  filterWard,
  filterMonth,
  searchQuery,
  onOrganismChange,
  onAntibioticChange,
  onWardChange,
  onMonthChange,
  onSearchChange,
  onResetFilters,
  totalRecords,
  filteredRecordsCount,
}) {
  const hasActiveFilters = Boolean(
    filterOrganism || filterAntibiotic || filterWard || filterMonth || searchQuery.trim()
  )

  const activeFilterCount = [
    filterOrganism,
    filterAntibiotic,
    filterWard,
    filterMonth,
    searchQuery.trim(),
  ].filter(Boolean).length

  return (
    <section className="filter-card">
      <div className="filter-header">
        <div className="filter-title">
          <span>Surveillance Filters</span>
          {hasActiveFilters && (
            <span className="filter-stats-badge highlight">
              {activeFilterCount} Active Filter{activeFilterCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className={`filter-stats-badge ${hasActiveFilters ? 'highlight' : ''}`}>
            Showing <strong>{filteredRecordsCount.toLocaleString()}</strong> of {totalRecords.toLocaleString()} isolates
            {hasActiveFilters && totalRecords > 0 && (
              ` (${((filteredRecordsCount / totalRecords) * 100).toFixed(1)}%)`
            )}
          </span>

          {hasActiveFilters && (
            <button className="filter-reset-btn has-active" onClick={onResetFilters}>
              ✕ Reset All
            </button>
          )}
        </div>
      </div>

      <div className="filter-row">
        {/* Quick Search */}
        <div className="filter-field grow-2">
          <label className="filter-label">Quick Search</label>
          <div className="filter-input-wrap">
            <input
              type="text"
              className="filter-input"
              placeholder="Search organism, antibiotic, ward..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button
                className="filter-clear-btn"
                onClick={() => onSearchChange('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Organism Filter */}
        <div className="filter-field">
          <label className="filter-label">Organism ({organisms.length})</label>
          <select
            className="filter-select"
            value={filterOrganism}
            onChange={(e) => onOrganismChange(e.target.value)}
          >
            <option value="">All Organisms</option>
            {organisms.map((org) => (
              <option key={org.name} value={org.name}>
                {org.name} ({org.count})
              </option>
            ))}
          </select>
        </div>

        {/* Antibiotic Filter */}
        <div className="filter-field">
          <label className="filter-label">Antibiotic ({antibiotics.length})</label>
          <select
            className="filter-select"
            value={filterAntibiotic}
            onChange={(e) => onAntibioticChange(e.target.value)}
          >
            <option value="">All Antibiotics</option>
            {antibiotics.map((anti) => (
              <option key={anti.name} value={anti.name}>
                {anti.name} ({anti.count})
              </option>
            ))}
          </select>
        </div>

        {/* Ward Filter */}
        <div className="filter-field">
          <label className="filter-label">Ward / Unit ({wards.length})</label>
          <select
            className="filter-select"
            value={filterWard}
            onChange={(e) => onWardChange(e.target.value)}
          >
            <option value="">All Wards</option>
            {wards.map((ward) => (
              <option key={ward.name} value={ward.name}>
                {ward.name} ({ward.count})
              </option>
            ))}
          </select>
        </div>

        {/* Month Filter */}
        {months.length > 1 && (
          <div className="filter-field" style={{ minWidth: '130px' }}>
            <label className="filter-label">Timeline Month</label>
            <select
              className="filter-select"
              value={filterMonth}
              onChange={(e) => onMonthChange(e.target.value)}
            >
              <option value="">All Months</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Removable Active Filter Chips */}
      {hasActiveFilters && (
        <div className="filter-chips-row">
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Active:
          </span>

          {filterOrganism && (
            <span className="filter-chip-item">
              <strong>Organism:</strong> {filterOrganism}
              <button className="filter-chip-remove" onClick={() => onOrganismChange('')}>✕</button>
            </span>
          )}

          {filterAntibiotic && (
            <span className="filter-chip-item">
              <strong>Antibiotic:</strong> {filterAntibiotic}
              <button className="filter-chip-remove" onClick={() => onAntibioticChange('')}>✕</button>
            </span>
          )}

          {filterWard && (
            <span className="filter-chip-item">
              <strong>Ward:</strong> {filterWard}
              <button className="filter-chip-remove" onClick={() => onWardChange('')}>✕</button>
            </span>
          )}

          {filterMonth && (
            <span className="filter-chip-item">
              <strong>Month:</strong> {filterMonth}
              <button className="filter-chip-remove" onClick={() => onMonthChange('')}>✕</button>
            </span>
          )}

          {searchQuery.trim() && (
            <span className="filter-chip-item">
              <strong>Query:</strong> "{searchQuery}"
              <button className="filter-chip-remove" onClick={() => onSearchChange('')}>✕</button>
            </span>
          )}
        </div>
      )}
    </section>
  )
}

function KPI({ label, value, sub, danger }) {
  return (
    <div className={`kpi ${danger ? 'danger' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <section className="card">
      <div className="card-title">
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  )
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{typeof value === 'number' ? value.toLocaleString() : value}</strong>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <section className="dashboard-skeleton" role="status" aria-label="Loading surveillance dashboard">
      <span className="visually-hidden">Loading saved surveillance data…</span>
      <div className="skeleton-block skeleton-periods" />
      <div className="skeleton-block skeleton-filters" />
      <div className="skeleton-dashboard">
        <div className="skeleton-block skeleton-navigation" />
        <div className="skeleton-main">
          <div className="skeleton-block skeleton-section-heading" />
          <div className="skeleton-kpis">
            {Array.from({ length: 5 }, (_, index) => (
              <div className="skeleton-block skeleton-kpi" key={index} />
            ))}
          </div>
          <div className="skeleton-panels">
            <div className="skeleton-block skeleton-panel" />
            <div className="skeleton-block skeleton-panel" />
          </div>
        </div>
      </div>
    </section>
  )
}

function MonthlyChangeChart({ data }) {
  if (!data || !data.length) {
    return <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>No monthly data available for the selected filters.</p>
  }

  const width = 700
  const height = 250
  const plotLeft = 58
  const plotRight = width - 16
  const zeroY = 122
  const maxBarHeight = 78
  const changes = data.map((item, index) => (
    index === 0
      ? 0
      : Number((item.resistanceRate - data[index - 1].resistanceRate).toFixed(1))
  ))
  const maxChange = Math.max(0.1, ...changes.map(Math.abs))
  const scaleMax = Math.ceil(maxChange * 10) / 10
  const slotWidth = (plotRight - plotLeft) / data.length
  const barWidth = Math.max(5, Math.min(36, slotWidth * 0.62))

  return (
    <div className="chart">
      <p className="chart-caption">Month-over-month change · percentage points (pp)</p>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monthly change in resistance rate, in percentage points">
        <line x1={plotLeft} y1={zeroY - maxBarHeight} x2={plotRight} y2={zeroY - maxBarHeight} className="chart-gridline" />
        <line x1={plotLeft} y1={zeroY} x2={plotRight} y2={zeroY} className="chart-zero-line" />
        <line x1={plotLeft} y1={zeroY + maxBarHeight} x2={plotRight} y2={zeroY + maxBarHeight} className="chart-gridline" />
        <text x={plotLeft - 8} y={zeroY - maxBarHeight + 4} className="chart-scale-label" textAnchor="end">+{scaleMax.toFixed(1)}</text>
        <text x={plotLeft - 8} y={zeroY + 4} className="chart-scale-label" textAnchor="end">0</text>
        <text x={plotLeft - 8} y={zeroY + maxBarHeight + 4} className="chart-scale-label" textAnchor="end">−{scaleMax.toFixed(1)}</text>
        {data.map((item, index) => {
          const previousItem = data[index - 1]
          const change = changes[index]
          const trend = !previousItem
            ? 'baseline'
            : change > 0
              ? 'increasing'
              : change < 0
                ? 'decreasing'
                : 'stable'
          const x = plotLeft + slotWidth * (index + 0.5)
          const barHeight = Math.abs(change / scaleMax) * maxBarHeight
          const barY = change >= 0 ? zeroY - barHeight : zeroY

          return (
            <g key={item.month} className={`change-bar-group ${trend}`}>
              {change !== 0 && <rect
                  x={x - barWidth / 2}
                  y={barY}
                  width={barWidth}
                  height={Math.max(2, barHeight)}
                  rx="4"
                  className={`change-bar ${change > 0 ? 'rising' : 'falling'}`}
                  style={{ animationDelay: `${index * 70}ms` }}
                  tabIndex="0"
                  aria-label={`${item.month}: ${change > 0 ? '+' : ''}${change.toFixed(1)} percentage points. Resistance rate ${item.resistanceRate.toFixed(1)}%.`}
                >
                  <title>{`${item.month}: ${change > 0 ? '+' : ''}${change.toFixed(1)} pp month over month · ${item.resistanceRate.toFixed(1)}% resistance`}</title>
                </rect>}
              <text
                x={x}
                y={change > 0 ? Math.max(16, barY - 7) : change < 0 ? Math.min(height - 30, zeroY + barHeight + 15) : zeroY - 8}
                className="change-value"
                textAnchor="middle"
              >
                {previousItem ? `${change > 0 ? '+' : ''}${change.toFixed(1)}` : 'Base'}
              </text>
              <text x={x} y={height - 5} className="change-month" textAnchor="middle">
                {item.month.slice(5)}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="chart-legend" aria-label="Monthly resistance change legend">
        <span><i className="increasing" /> Increased</span>
        <span><i className="decreasing" /> Decreased</span>
        <span><i className="stable" /> No change</span>
        <span><i className="baseline" /> First month (baseline)</span>
      </div>

      <div className="chart-rate-caption">Monthly resistance rate</div>
      <div className="chart-labels">
        {data.map((item, index) => {
          const previousItem = data[index - 1]
          const change = previousItem
            ? Number((item.resistanceRate - previousItem.resistanceRate).toFixed(1))
            : 0
          const trend = !previousItem
            ? 'baseline'
            : change > 0
              ? 'increasing'
              : change < 0
                ? 'decreasing'
                : 'stable'

          return (
            <span key={item.month} className={`chart-label ${trend}`}>
              {item.month.slice(5)}: {item.resistanceRate.toFixed(1)}%
            </span>
          )
        })}
      </div>
    </div>
  )
}

function WardComparison({ current, previous }) {
  const dynamicWards = [...new Set(current.rows.map((r) => r.ward))].filter(Boolean)
  const wards = dynamicWards.length > 0 ? dynamicWards : ['ICU', 'General Ward']

  return (
    <div className="ward-list">
      {wards.map((ward, index) => {
        const currentGroup = groupAnalysis(
          current.rows.filter((r) => r.ward === ward),
          []
        )[0]

        const oldGroup = previous
          ? groupAnalysis(
              previous.rows.filter((r) => r.ward === ward),
              []
            )[0]
          : null

        const currentRate = currentGroup?.resistanceRate || 0
        const oldRate = oldGroup?.resistanceRate

        const change =
          oldRate === undefined
            ? null
            : currentRate - oldRate

        return (
          <div className="ward-row" key={ward}>
            <div>
              <strong>{ward}</strong>
              <span>{currentRate.toFixed(1)}% resistance</span>
            </div>

            <div className="bar">
              <div
                className="ward-bar-fill"
                style={{
                  width: `${Math.min(currentRate, 100)}%`,
                  animationDelay: `${index * 90}ms`,
                }}
              />
            </div>

            {change !== null && (
              <strong
                className={
                  change > 0
                    ? 'change-up'
                    : change < 0
                    ? 'change-down'
                    : ''
                }
              >
                {change > 0 ? '↑' : change < 0 ? '↓' : '→'}{' '}
                {Math.abs(change).toFixed(1)} pp
              </strong>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ComparisonTab({
  comparison,
  previous,
  current,
  periods = [],
  comparePeriod1Id,
  comparePeriod2Id,
  setComparePeriod1Id,
  setComparePeriod2Id,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'alert', 'increased', 'decreased', 'stable'
  const [minSample, setMinSample] = useState(false)
  const [sortBy, setSortBy] = useState('change-abs') // 'change-abs', 'change-asc', 'change-desc', 'rate-desc', 'name-asc'

  if (!comparison || !previous || !current) {
    return (
      <section className="empty-state small">
        <h2>Comparison requires at least 2 datasets</h2>
        <p>Upload another period CSV to compare changes between datasets.</p>
      </section>
    )
  }

  return (
    <>
      {periods.length > 2 && (
        <Card title="Select Periods to Compare">
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1', minWidth: '220px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Baseline Period (A)
              </label>
              <select
                value={comparePeriod1Id || previous.id}
                onChange={(e) => setComparePeriod1Id(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-strong)', background: '#ffffff', color: 'var(--text-primary)', fontWeight: '600' }}
              >
                {periods.map((p, i) => (
                  <option key={p.id} value={p.id} disabled={p.id === current.id}>
                    Period {i + 1}: {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1', minWidth: '220px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Comparison Period (B)
              </label>
              <select
                value={comparePeriod2Id || current.id}
                onChange={(e) => setComparePeriod2Id(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-strong)', background: '#ffffff', color: 'var(--text-primary)', fontWeight: '600' }}
              >
                {periods.map((p, i) => (
                  <option key={p.id} value={p.id} disabled={p.id === previous.id}>
                    Period {i + 1}: {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Comparison Path Filters */}
      <div className="path-filter-bar">
        <div className="path-filter-pills">
          <button
            className={`path-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Comparisons
          </button>
          <button
            className={`path-pill danger ${statusFilter === 'alert' ? 'active' : ''}`}
            onClick={() => setStatusFilter('alert')}
          >
            Surges & Alerts
          </button>
          <button
            className={`path-pill danger ${statusFilter === 'increased' ? 'active' : ''}`}
            onClick={() => setStatusFilter('increased')}
          >
            Increased (↑)
          </button>
          <button
            className={`path-pill success ${statusFilter === 'decreased' ? 'active' : ''}`}
            onClick={() => setStatusFilter('decreased')}
          >
            Decreased (↓)
          </button>
          <button
            className={`path-pill ${statusFilter === 'stable' ? 'active' : ''}`}
            onClick={() => setStatusFilter('stable')}
          >
            Stable (→)
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Quick filter input */}
          <div className="filter-input-wrap" style={{ width: '190px' }}>
            <input
              type="text"
              className="filter-input"
              placeholder="Search table..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '6px 26px 6px 12px', fontSize: '12px' }}
            />
            {searchTerm && (
              <button
                className="filter-clear-btn"
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Min sample size toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={minSample}
              onChange={(e) => setMinSample(e.target.checked)}
            />
            ≥10 sample size
          </label>

          {/* Sort order */}
          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '6px 10px', fontSize: '12px', width: 'auto' }}
          >
            <option value="change-abs">Sort: Greatest Absolute Shift</option>
            <option value="change-desc">Sort: Highest Increase (↑)</option>
            <option value="change-asc">Sort: Highest Decrease (↓)</option>
            <option value="rate-desc">Sort: Highest Current Rate</option>
          </select>
        </div>
      </div>

      <section className="kpi-grid">
        <KPI
          label="Baseline Resistance"
          value={`${comparison.overall.previousRate.toFixed(1)}%`}
          sub={previous.name}
        />

        <KPI
          label="Comparison Resistance"
          value={`${comparison.overall.currentRate.toFixed(1)}%`}
          sub={current.name}
        />

        <KPI
          label="Change"
          value={`${comparison.overall.change >= 0 ? '+' : ''}${comparison.overall.change.toFixed(1)} pp`}
          sub="Percentage points"
          danger={comparison.overall.change >= ALERT_THRESHOLD}
        />

        <KPI
          label="Alerts"
          value={comparison.organismAntibioticWard.filter((x) => x.alert).length}
          sub="Surges detected"
        />
      </section>

      <Card title="Organism Comparison">
        <ComparisonTable
          data={comparison.organism}
          fields={['organism']}
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          minSample={minSample}
          sortBy={sortBy}
        />
      </Card>

      <Card title="Antibiotic Comparison">
        <ComparisonTable
          data={comparison.antibiotic}
          fields={['antibiotic']}
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          minSample={minSample}
          sortBy={sortBy}
        />
      </Card>

      <Card title="Ward Comparison">
        <ComparisonTable
          data={comparison.ward}
          fields={['ward']}
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          minSample={minSample}
          sortBy={sortBy}
        />
      </Card>
    </>
  )
}

function ComparisonTable({
  data,
  fields,
  searchTerm = '',
  statusFilter = 'all',
  minSample = false,
  sortBy = 'change-abs',
}) {
  const filtered = useMemo(() => {
    let list = data.filter((row) => {
      if (minSample && (row.total || 0) < 10) return false
      if (statusFilter === 'alert' && !row.alert) return false
      if (statusFilter === 'increased' && (row.change || 0) <= 0) return false
      if (statusFilter === 'decreased' && (row.change || 0) >= 0) return false
      if (statusFilter === 'stable' && row.status !== 'Stable') return false

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim()
        const match = fields.some((f) => row[f] && row[f].toLowerCase().includes(q))
        if (!match) return false
      }
      return true
    })

    return list.sort((a, b) => {
      const changeA = a.change || 0
      const changeB = b.change || 0
      if (sortBy === 'change-abs') return Math.abs(changeB) - Math.abs(changeA)
      if (sortBy === 'change-desc') return changeB - changeA
      if (sortBy === 'change-asc') return changeA - changeB
      if (sortBy === 'rate-desc') return (b.resistanceRate || 0) - (a.resistanceRate || 0)
      return 0
    })
  }, [data, fields, searchTerm, statusFilter, minSample, sortBy])

  if (!filtered.length) {
    return <p className="muted" style={{ padding: '16px 0', textAlign: 'center' }}>No comparison entries match the active filters.</p>
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            {fields.map((field) => (
              <th key={field}>{field.replaceAll('_', ' ')}</th>
            ))}
            <th>Previous %</th>
            <th>Current %</th>
            <th>Change</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((row, index) => (
            <tr key={index}>
              {fields.map((field) => (
                <td key={field}>{row[field]}</td>
              ))}

              <td>
                {row.previousRate === null
                  ? '-'
                  : `${row.previousRate.toFixed(1)}%`}
              </td>

              <td>{row.resistanceRate.toFixed(1)}%</td>

              <td
                className={
                  row.change > 0
                    ? 'change-up'
                    : row.change < 0
                    ? 'change-down'
                    : ''
                }
              >
                {row.change === null
                  ? '-'
                  : `${row.change >= 0 ? '+' : ''}${row.change.toFixed(1)} pp`}
              </td>

              <td>
                <span className={`badge ${row.status.toLowerCase()}`}>
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TrendsTab({ trendResults }) {
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'Increasing', 'Stable', 'Decreasing'
  const [searchTerm, setSearchTerm] = useState('')
  const [organismFilter, setOrganismFilter] = useState('all')
  const [antibioticFilter, setAntibioticFilter] = useState('all')
  const [wardFilter, setWardFilter] = useState('all')
  const [sortBy, setSortBy] = useState('slope-desc')

  const availableOrganisms = useMemo(() => {
    return [...new Set(trendResults.map((r) => r.organism))].filter(Boolean).sort()
  }, [trendResults])

  const availableAntibiotics = useMemo(() => {
    return [...new Set(trendResults.map((r) => r.antibiotic))].filter(Boolean).sort()
  }, [trendResults])

  const availableWards = useMemo(() => {
    return [...new Set(trendResults.map((r) => r.ward))].filter(Boolean).sort()
  }, [trendResults])

  const counts = useMemo(() => {
    return {
      all: trendResults.length,
      increasing: trendResults.filter((r) => r.trendStatus === 'Increasing').length,
      stable: trendResults.filter((r) => r.trendStatus === 'Stable').length,
      decreasing: trendResults.filter((r) => r.trendStatus === 'Decreasing').length,
    }
  }, [trendResults])

  const filtered = useMemo(() => {
    let list = trendResults.filter((row) => {
      if (statusFilter !== 'all' && row.trendStatus !== statusFilter) return false
      if (organismFilter !== 'all' && row.organism !== organismFilter) return false
      if (antibioticFilter !== 'all' && row.antibiotic !== antibioticFilter) return false
      if (wardFilter !== 'all' && row.ward !== wardFilter) return false

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim()
        const match =
          (row.organism && row.organism.toLowerCase().includes(q)) ||
          (row.antibiotic && row.antibiotic.toLowerCase().includes(q)) ||
          (row.ward && row.ward.toLowerCase().includes(q))
        if (!match) return false
      }
      return true
    })

    return list.sort((a, b) => {
      if (sortBy === 'slope-desc') return b.trendSlope - a.trendSlope
      if (sortBy === 'slope-asc') return a.trendSlope - b.trendSlope
      if (sortBy === 'rate-desc') return b.resistanceRate - a.resistanceRate
      if (sortBy === 'rate-asc') return a.resistanceRate - b.resistanceRate
      return 0
    })
  }, [trendResults, statusFilter, organismFilter, antibioticFilter, wardFilter, searchTerm, sortBy])

  return (
    <Card title={`Resistance Trends (${filtered.length} of ${trendResults.length})`}>
      {/* Trends Path Filter Bar */}
      <div className="path-filter-bar">
        <div className="path-filter-pills">
          <button
            className={`path-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Trends <span className="path-pill-count">{counts.all}</span>
          </button>
          <button
            className={`path-pill danger ${statusFilter === 'Increasing' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Increasing')}
          >
            Increasing <span className="path-pill-count">{counts.increasing}</span>
          </button>
          <button
            className={`path-pill ${statusFilter === 'Stable' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Stable')}
          >
            Stable (➡️) <span className="path-pill-count">{counts.stable}</span>
          </button>
          <button
            className={`path-pill success ${statusFilter === 'Decreasing' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Decreasing')}
          >
            Decreasing <span className="path-pill-count">{counts.decreasing}</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Quick Search */}
          <div className="filter-input-wrap" style={{ width: '180px' }}>
            <input
              type="text"
              className="filter-input"
              placeholder="Search trends..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '6px 26px 6px 12px', fontSize: '12px' }}
            />
            {searchTerm && (
              <button
                className="filter-clear-btn"
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Organism Selector */}
          <select
            className="filter-select"
            value={organismFilter}
            onChange={(e) => setOrganismFilter(e.target.value)}
            style={{ padding: '6px 10px', fontSize: '12px', width: 'auto' }}
          >
            <option value="all">All Organisms</option>
            {availableOrganisms.map((org) => (
              <option key={org} value={org}>{org}</option>
            ))}
          </select>

          {/* Ward Selector */}
          <select
            className="filter-select"
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
            style={{ padding: '6px 10px', fontSize: '12px', width: 'auto' }}
          >
            <option value="all">All Wards</option>
            {availableWards.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>

          {/* Sort order */}
          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '6px 10px', fontSize: '12px', width: 'auto' }}
          >
            <option value="slope-desc">Sort: Steepest Slope (Rise)</option>
            <option value="slope-asc">Sort: Lowest Slope (Fall)</option>
            <option value="rate-desc">Sort: Highest Resistance %</option>
            <option value="rate-asc">Sort: Lowest Resistance %</option>
          </select>
        </div>
      </div>

      {!filtered.length ? (
        <p className="muted" style={{ padding: '20px 0', textAlign: 'center' }}>No resistance trends match your filter criteria.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Organism</th>
                <th>Antibiotic</th>
                <th>Ward</th>
                <th>Resistance %</th>
                <th>Slope</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((row, index) => (
                <tr key={index}>
                  <td><strong>{row.organism}</strong></td>
                  <td>{row.antibiotic}</td>
                  <td>{row.ward}</td>
                  <td>{row.resistanceRate.toFixed(1)}%</td>
                  <td>{row.trendSlope.toFixed(2)} pp/month</td>
                  <td>
                    <span className={`badge ${row.trendStatus.toLowerCase()}`}>
                      {row.trendStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function AlertsTab({ alerts }) {
  const [severityFilter, setSeverityFilter] = useState('all') // 'all', 'high' (>=15), 'critical' (>=20)
  const [wardFilter, setWardFilter] = useState('all')
  const [organismFilter, setOrganismFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const availableWards = useMemo(() => {
    return [...new Set(alerts.map((a) => a.ward))].filter(Boolean).sort()
  }, [alerts])

  const availableOrganisms = useMemo(() => {
    return [...new Set(alerts.map((a) => a.organism))].filter(Boolean).sort()
  }, [alerts])

  const counts = useMemo(() => {
    return {
      all: alerts.length,
      high: alerts.filter((a) => a.change >= 15).length,
      critical: alerts.filter((a) => a.change >= 20).length,
    }
  }, [alerts])

  const filtered = useMemo(() => {
    return alerts
      .filter((alert) => {
        if (severityFilter === 'high' && alert.change < 15) return false
        if (severityFilter === 'critical' && alert.change < 20) return false
        if (wardFilter !== 'all' && alert.ward !== wardFilter) return false
        if (organismFilter !== 'all' && alert.organism !== organismFilter) return false

        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim()
          const match =
            (alert.organism && alert.organism.toLowerCase().includes(q)) ||
            (alert.antibiotic && alert.antibiotic.toLowerCase().includes(q)) ||
            (alert.ward && alert.ward.toLowerCase().includes(q))
          if (!match) return false
        }
        return true
      })
      .sort((a, b) => b.change - a.change)
  }, [alerts, severityFilter, wardFilter, organismFilter, searchTerm])

  if (!alerts.length) {
    return (
      <section className="no-alerts">
        <div className="success-label">SIGNAL STATUS / CLEAR</div>
        <h2>No strong early warnings</h2>
        <p>
          No organism + antibiotic + ward combination crossed the configured
          alert threshold.
        </p>
      </section>
    )
  }

  return (
    <Card title={`Early Warning Alerts (${filtered.length} of ${alerts.length})`}>
      {/* Alerts Path Filters */}
      <div className="path-filter-bar">
        <div className="path-filter-pills">
          <button
            className={`path-pill ${severityFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSeverityFilter('all')}
          >
            All Alerts (≥10 pp) <span className="path-pill-count">{counts.all}</span>
          </button>
          <button
            className={`path-pill danger ${severityFilter === 'high' ? 'active' : ''}`}
            onClick={() => setSeverityFilter('high')}
          >
            High Surge (≥15 pp) <span className="path-pill-count">{counts.high}</span>
          </button>
          <button
            className={`path-pill danger ${severityFilter === 'critical' ? 'active' : ''}`}
            onClick={() => setSeverityFilter('critical')}
          >
            Critical Surge (≥20 pp) <span className="path-pill-count">{counts.critical}</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Quick Search */}
          <div className="filter-input-wrap" style={{ width: '180px' }}>
            <input
              type="text"
              className="filter-input"
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '6px 26px 6px 12px', fontSize: '12px' }}
            />
            {searchTerm && (
              <button
                className="filter-clear-btn"
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Ward filter */}
          {availableWards.length > 1 && (
            <select
              className="filter-select"
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '12px', width: 'auto' }}
            >
              <option value="all">All Wards</option>
              {availableWards.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          )}

          {/* Organism filter */}
          {availableOrganisms.length > 1 && (
            <select
              className="filter-select"
              value={organismFilter}
              onChange={(e) => setOrganismFilter(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '12px', width: 'auto' }}
            >
              <option value="all">All Organisms</option>
              {availableOrganisms.map((org) => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {!filtered.length ? (
        <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>No alert combinations match your filter criteria.</p>
      ) : (
        <div className="alert-grid">
          {filtered.map((alert, index) => (
            <div className="alert-card" key={index}>
              <div className="alert-top">
                <span>EARLY WARNING</span>
                <strong>+{alert.change.toFixed(1)} pp</strong>
              </div>

              <h3>{alert.organism}</h3>
              <p>{alert.antibiotic}</p>
              <p>{alert.ward}</p>

              <div className="alert-values">
                <span>
                  Previous:{' '}
                  {alert.previousRate === null
                    ? '-'
                    : `${alert.previousRate.toFixed(1)}%`}
                </span>

                <span>
                  Current: {alert.resistanceRate.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function RecommendationsTab({ recommendations }) {
  if (!recommendations.length) {
    return (
      <section className="no-alerts">
        <div className="success-label">RECOMMENDATION STATUS / CLEAR</div>
        <h2>No alert-driven recommendations</h2>
        <p>
          Recommendations are generated when an organism-antibiotic-ward alert
          is detected and comparison-period data is available.
        </p>
      </section>
    )
  }

  return (
    <section className="recommendations-section">
      <div className="recommendations-method">
        <strong>How alternatives are ranked</strong>
        <span>
          Composite resistance risk = 45% organism-wide observed resistance +
          30% ward resistance + 25% three-month linear trend projection. The
          projection uses monthly R/S results (or the observed rate if history
          is insufficient). Alternatives need at least {MIN_SAMPLE} ward R/S
          tests and a lower composite score than the alerted antibiotic.
        </span>
      </div>

      <div className="recommendation-list">
        {recommendations.map((recommendation) => (
          <article
            className="recommendation-card"
            key={`${recommendation.organism}-${recommendation.antibiotic}-${recommendation.ward}`}
          >
            <header className="recommendation-heading">
              <div>
                <span className="recommendation-eyebrow">ALERT CONTEXT</span>
                <h2>{recommendation.organism}</h2>
                <p>
                  {recommendation.ward} · {recommendation.antibiotic} ·{' '}
                  {recommendation.change > 0 ? '+' : ''}
                  {recommendation.change.toFixed(1)} pp versus previous period
                </p>
              </div>
              <span className="recommendation-risk">
                {recommendation.currentRisk
                  ? `Current risk ${recommendation.currentRisk.riskScore.toFixed(1)}`
                  : 'Insufficient risk data'}
              </span>
            </header>

            {recommendation.currentRisk && (
              <div className="recommendation-metrics">
                <div>
                  <span>Organism-wide resistance</span>
                  <strong>
                    {recommendation.currentRisk.currentResistance.toFixed(1)}%
                    <small> · n={recommendation.currentRisk.overallTested}</small>
                  </strong>
                </div>
                <div>
                  <span>Ward resistance</span>
                  <strong>
                    {recommendation.currentRisk.wardResistance.toFixed(1)}%
                    <small> · n={recommendation.currentRisk.wardTested}</small>
                  </strong>
                </div>
                <div>
                  <span>Trend</span>
                  <strong>
                    {recommendation.currentRisk.trendSlope === null
                      ? 'Insufficient history'
                      : `${recommendation.currentRisk.trendSlope > 0 ? '+' : ''}${recommendation.currentRisk.trendSlope.toFixed(1)} pp/month`}
                  </strong>
                </div>
                <div>
                  <span>Three-month projection</span>
                  <strong>
                    {recommendation.currentRisk.forecastRate.toFixed(1)}%
                  </strong>
                </div>
              </div>
            )}

            <h3 className="recommendation-subheading">
              Lower-risk alternatives ({recommendation.alternatives.length})
            </h3>
            {recommendation.alternatives.length ? (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Antibiotic</th>
                      <th>Current resistance</th>
                      <th>Ward resistance</th>
                      <th>Trend</th>
                      <th>3-month projection</th>
                      <th>Composite risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendation.alternatives.map((alternative, index) => (
                      <tr key={alternative.antibiotic}>
                        <td>{index + 1}</td>
                        <td>{alternative.antibiotic}</td>
                        <td>
                          {alternative.currentResistance.toFixed(1)}% (n=
                          {alternative.overallTested})
                        </td>
                        <td>
                          {alternative.wardResistance.toFixed(1)}% (n=
                          {alternative.wardTested})
                        </td>
                        <td>
                          {alternative.trendSlope === null
                            ? 'Insufficient history'
                            : `${alternative.trendSlope > 0 ? '+' : ''}${alternative.trendSlope.toFixed(1)} pp/month`}
                        </td>
                        <td>{alternative.forecastRate.toFixed(1)}%</td>
                        <td>{alternative.riskScore.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="recommendation-empty">
                No lower-risk alternative has sufficient observed results in
                this ward for comparison.
              </p>
            )}

            <h3 className="recommendation-subheading">Data-driven actions</h3>
            <ul className="recommendation-actions">
              {recommendation.actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
            <p className="recommendation-disclaimer">
              Surveillance comparison only; confirm individual isolate
              susceptibility and follow clinical judgment and local guidance.
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

function DetailsTab({
  current,
  comparison,
  filterOrganism,
  filterAntibiotic,
  filterWard,
  onSelectOrganism,
  onSelectAntibiotic,
  onSelectWard,
}) {
  const [detailsSearch, setDetailsSearch] = useState('')
  const [detailsStatus, setDetailsStatus] = useState('all')
  const [detailsWard, setDetailsWard] = useState('all')
  const [recordsPage, setRecordsPage] = useState(1)
  const [recordsSearch, setRecordsSearch] = useState('')
  const [recordsAstFilter, setRecordsAstFilter] = useState('all')

  const PAGE_SIZE = 12

  const organisms = useMemo(() => {
    return [...new Set(current.rows.map((row) => row.organism))].filter(Boolean).sort()
  }, [current])

  const antibiotics = useMemo(() => {
    return [...new Set(current.rows.map((row) => row.antibiotic))].filter(Boolean).sort()
  }, [current])

  const wards = useMemo(() => {
    return [...new Set(current.rows.map((row) => row.ward))].filter(Boolean).sort()
  }, [current])

  // Multi-variable comparison filtered rows
  const filteredMultiTable = useMemo(() => {
    if (!comparison) return []
    return comparison.organismAntibioticWard.filter((row) => {
      if (detailsStatus !== 'all' && row.status !== detailsStatus) return false
      if (detailsWard !== 'all' && row.ward !== detailsWard) return false
      if (detailsSearch.trim()) {
        const q = detailsSearch.toLowerCase().trim()
        const match =
          (row.organism && row.organism.toLowerCase().includes(q)) ||
          (row.antibiotic && row.antibiotic.toLowerCase().includes(q)) ||
          (row.ward && row.ward.toLowerCase().includes(q))
        if (!match) return false
      }
      return true
    }).sort((a, b) => Math.abs(b.change || 0) - Math.abs(a.change || 0))
  }, [comparison, detailsStatus, detailsWard, detailsSearch])

  // Filtered raw records for inspector
  const filteredRecords = useMemo(() => {
    return current.rows.filter((row) => {
      if (recordsAstFilter !== 'all' && row.ast_result !== recordsAstFilter) return false
      if (recordsSearch.trim()) {
        const q = recordsSearch.toLowerCase().trim()
        const match =
          (row.organism && row.organism.toLowerCase().includes(q)) ||
          (row.antibiotic && row.antibiotic.toLowerCase().includes(q)) ||
          (row.ward && row.ward.toLowerCase().includes(q)) ||
          (row.ast_result && row.ast_result.toLowerCase().includes(q))
        if (!match) return false
      }
      return true
    })
  }, [current.rows, recordsAstFilter, recordsSearch])

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE))
  const paginatedRecords = useMemo(() => {
    const start = (recordsPage - 1) * PAGE_SIZE
    return filteredRecords.slice(start, start + PAGE_SIZE)
  }, [filteredRecords, recordsPage])

  return (
    <>
      <section className="stats-grid large">
        <Stat label="Organisms" value={organisms.length} />
        <Stat label="Antibiotics" value={antibiotics.length} />
        <Stat label="Wards" value={wards.length} />
        <Stat label="Matching Rows" value={current.rows.length} />
      </section>

      {/* Interactive Tag Filter Clouds */}
      <Card title="Organisms (Click any tag to toggle filter)">
        <div className="tag-list">
          {organisms.map((item) => (
            <span
              key={item}
              className={`interactive-tag ${filterOrganism === item ? 'active' : ''}`}
              onClick={() => onSelectOrganism(filterOrganism === item ? '' : item)}
              title={`Click to filter by ${item}`}
            >
              {filterOrganism === item ? `✓ ${item}` : item}
            </span>
          ))}
        </div>
      </Card>

      <Card title="Antibiotics (Click any tag to toggle filter)">
        <div className="tag-list">
          {antibiotics.map((item) => (
            <span
              key={item}
              className={`interactive-tag ${filterAntibiotic === item ? 'active' : ''}`}
              onClick={() => onSelectAntibiotic(filterAntibiotic === item ? '' : item)}
              title={`Click to filter by ${item}`}
            >
              {filterAntibiotic === item ? `✓ ${item}` : item}
            </span>
          ))}
        </div>
      </Card>

      <Card title="Wards / Units (Click any tag to toggle filter)">
        <div className="tag-list">
          {wards.map((item) => (
            <span
              key={item}
              className={`interactive-tag ${filterWard === item ? 'active' : ''}`}
              onClick={() => onSelectWard(filterWard === item ? '' : item)}
              title={`Click to filter by ${item}`}
            >
              {filterWard === item ? `✓ ${item}` : item}
            </span>
          ))}
        </div>
      </Card>

      {/* 3-Way Multi-variable Comparison Table */}
      {comparison && (
        <Card title={`Detailed Multi-Variable Comparison (${filteredMultiTable.length} combinations)`}>
          <div className="path-filter-bar">
            <div className="filter-input-wrap" style={{ minWidth: '220px' }}>
              <input
                type="text"
                className="filter-input"
                placeholder="Search organism, drug, ward..."
                value={detailsSearch}
                onChange={(e) => setDetailsSearch(e.target.value)}
                style={{ padding: '6px 26px 6px 12px', fontSize: '12px' }}
              />
              {detailsSearch && (
                <button
                  className="filter-clear-btn"
                  onClick={() => setDetailsSearch('')}
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                className="filter-select"
                value={detailsStatus}
                onChange={(e) => setDetailsStatus(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '12px', width: 'auto' }}
              >
                <option value="all">All Statuses</option>
                <option value="Increased">Increased (↑)</option>
                <option value="Decreased">Decreased (↓)</option>
                <option value="Stable">Stable (→)</option>
                <option value="New">New</option>
              </select>

              {wards.length > 1 && (
                <select
                  className="filter-select"
                  value={detailsWard}
                  onChange={(e) => setDetailsWard(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '12px', width: 'auto' }}
                >
                  <option value="all">All Wards</option>
                  {wards.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Organism</th>
                  <th>Antibiotic</th>
                  <th>Ward</th>
                  <th>Previous %</th>
                  <th>Current %</th>
                  <th>Change</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMultiTable.map((row, idx) => (
                  <tr key={idx}>
                    <td><strong>{row.organism}</strong></td>
                    <td>{row.antibiotic}</td>
                    <td>{row.ward}</td>
                    <td>{row.previousRate !== null ? `${row.previousRate.toFixed(1)}%` : '-'}</td>
                    <td>{row.resistanceRate.toFixed(1)}%</td>
                    <td
                      className={
                        row.change > 0
                          ? 'change-up'
                          : row.change < 0
                          ? 'change-down'
                          : ''
                      }
                    >
                      {row.change === null ? '-' : `${row.change >= 0 ? '+' : ''}${row.change.toFixed(1)} pp`}
                    </td>
                    <td>
                      <span className={`badge ${row.status.toLowerCase()}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Filtered Isolate Records Inspector */}
      <Card title={`Filtered Isolate Records (${filteredRecords.length.toLocaleString()} records)`}>
        <div className="path-filter-bar">
          <div className="filter-input-wrap" style={{ minWidth: '220px' }}>
            <input
              type="text"
              className="filter-input"
              placeholder="Search records..."
              value={recordsSearch}
              onChange={(e) => {
                setRecordsSearch(e.target.value)
                setRecordsPage(1)
              }}
              style={{ padding: '6px 26px 6px 12px', fontSize: '12px' }}
            />
            {recordsSearch && (
              <button
                className="filter-clear-btn"
                onClick={() => {
                  setRecordsSearch('')
                  setRecordsPage(1)
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>AST Result:</label>
            <select
              className="filter-select"
              value={recordsAstFilter}
              onChange={(e) => {
                setRecordsAstFilter(e.target.value)
                setRecordsPage(1)
              }}
              style={{ padding: '6px 10px', fontSize: '12px', width: 'auto' }}
            >
              <option value="all">All Phenotypes</option>
              <option value="R">Resistant (R)</option>
              <option value="S">Susceptible (S)</option>
              <option value="I">Intermediate (I)</option>
            </select>
          </div>
        </div>

        <div className="records-table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Organism</th>
                <th>Antibiotic</th>
                <th>Ward</th>
                <th>AST Phenotype</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.map((r, i) => (
                <tr key={i}>
                  <td>{r.date instanceof Date ? r.date.toLocaleDateString() : r.date}</td>
                  <td><strong>{r.organism}</strong></td>
                  <td>{r.antibiotic}</td>
                  <td>{r.ward}</td>
                  <td>
                    <span className={`badge-ast ${r.ast_result ? r.ast_result.toLowerCase() : ''}`}>
                      {r.ast_result === 'R' ? 'R (Resistant)' : r.ast_result === 'S' ? 'S (Susceptible)' : 'I (Intermediate)'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination-controls">
          <span>
            Page {recordsPage} of {totalPages} ({filteredRecords.length.toLocaleString()} total rows)
          </span>
          <div className="pagination-buttons">
            <button
              className="pagination-btn"
              disabled={recordsPage <= 1}
              onClick={() => setRecordsPage((p) => Math.max(1, p - 1))}
            >
              ← Previous
            </button>
            <button
              className="pagination-btn"
              disabled={recordsPage >= totalPages}
              onClick={() => setRecordsPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        </div>
      </Card>
    </>
  )
}

export default App