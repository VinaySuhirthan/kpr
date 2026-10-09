import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import './styles/level4.css'

const formatPercent = (value) =>
  Number.isFinite(Number(value)) ? `${(Number(value) * 100).toFixed(1)}%` : '—'

const formatChange = (value) => {
  if (!Number.isFinite(Number(value))) return '—'
  const points = Number(value) * 100
  return `${points > 0 ? '+' : ''}${points.toFixed(1)} pp`
}

const associationColors = [
  '#39866d',
  '#5b78a6',
  '#ba7b38',
  '#8a68a8',
  '#398b98',
  '#bd6470',
  '#728b3f',
  '#547f91',
]

function RiskBadge({ level }) {
  return <span className={`risk-badge risk-${String(level).toLowerCase()}`}>{level}</span>
}

function ResistanceChart({ rows, forecast }) {
  const history = rows.slice(-24)
  if (!history.length || !forecast) {
    return <div className="empty-state">No monthly history is available for this selection.</div>
  }

  const width = 760
  const height = 270
  const left = 44
  const right = 18
  const top = 16
  const bottom = 34
  const chartWidth = width - left - right
  const chartHeight = height - top - bottom
  const count = history.length + 1
  const point = (value, index) => ({
    x: left + (index / Math.max(count - 1, 1)) * chartWidth,
    y: top + (1 - Math.max(0, Math.min(1, Number(value)))) * chartHeight,
  })
  const historicalPoints = history.map((row, index) =>
    point(row.resistance_rate, index),
  )
  const forecastPoint = point(
    forecast.predicted_next_month_resistance,
    history.length,
  )
  const line = historicalPoints.map(({ x, y }) => `${x},${y}`).join(' ')
  const lastPoint = historicalPoints[historicalPoints.length - 1]

  return (
    <div className="chart-wrap">
      <svg
        className="resistance-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Monthly historical resistance and next-month forecast"
      >
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = top + (1 - tick / 100) * chartHeight
          return (
            <g key={tick}>
              <line x1={left} x2={width - right} y1={y} y2={y} className="chart-grid" />
              <text x={left - 8} y={y + 4} textAnchor="end" className="chart-label">
                {tick}%
              </text>
            </g>
          )
        })}
        <polyline points={line} className="history-line" />
        <line
          x1={lastPoint.x}
          y1={lastPoint.y}
          x2={forecastPoint.x}
          y2={forecastPoint.y}
          className="forecast-line"
        />
        {historicalPoints.map(({ x, y }, index) => (
          <circle key={history[index].year_month} cx={x} cy={y} r="2.3" className="history-dot" />
        ))}
        <circle cx={forecastPoint.x} cy={forecastPoint.y} r="5" className="forecast-dot" />
        <text x={left} y={height - 8} className="chart-label">
          {history[0].year_month.slice(0, 7)}
        </text>
        <text x={width - right} y={height - 8} textAnchor="end" className="chart-label">
          {forecast.forecast_month}
        </text>
      </svg>
      <div className="chart-legend">
        <span><i className="legend-history" /> Historical</span>
        <span><i className="legend-forecast" /> Next-month forecast</span>
      </div>
    </div>
  )
}

function App() {
  const [forecasts, setForecasts] = useState([])
  const [summary, setSummary] = useState(null)
  const [risks, setRisks] = useState([])
  const [relationships, setRelationships] = useState([])
  const [filters, setFilters] = useState({ organism: '', ward: '', antibiotic: '' })
  const [selectedForecast, setSelectedForecast] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([api.forecasts(), api.summary(), api.risks(), api.relationships()])
      .then(([forecastRows, summaryData, riskRows, relationshipRows]) => {
        if (!alive) return
        setForecasts(forecastRows)
        setSummary(summaryData)
        setRisks(riskRows)
        setRelationships(relationshipRows)
        if (forecastRows.length) {
          setFilters({
            organism: forecastRows[0].organism,
            ward: forecastRows[0].ward,
            antibiotic: forecastRows[0].antibiotic,
          })
        }
      })
      .catch((requestError) => {
        if (alive) setError(requestError.message)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!filters.organism || !filters.ward || !filters.antibiotic) return
    let alive = true
    Promise.all([
      api.forecast(filters.organism, filters.ward, filters.antibiotic),
      api.trends(filters.organism, filters.ward, filters.antibiotic),
    ])
      .then(([forecastRows, trendRows]) => {
        if (!alive) return
        setSelectedForecast(forecastRows[0] || null)
        setHistory(trendRows)
      })
      .catch((requestError) => {
        if (alive) setError(requestError.message)
      })
    return () => {
      alive = false
    }
  }, [filters])

  const organisms = useMemo(
    () => [...new Set(forecasts.map((row) => row.organism))].sort(),
    [forecasts],
  )
  const wards = useMemo(
    () =>
      [...new Set(forecasts.filter((row) => row.organism === filters.organism).map((row) => row.ward))].sort(),
    [forecasts, filters.organism],
  )
  const antibiotics = useMemo(
    () =>
      [...new Set(
        forecasts
          .filter((row) => row.organism === filters.organism && row.ward === filters.ward)
          .map((row) => row.antibiotic),
      )].sort(),
    [forecasts, filters.organism, filters.ward],
  )
  const selectedRelationships = relationships
    .filter(
      (row) =>
        row.organism === filters.organism &&
        row.ward === filters.ward &&
        (row.source_antibiotic === filters.antibiotic ||
          row.target_antibiotic === filters.antibiotic),
    )
    .sort((a, b) => b.combined_relationship_score - a.combined_relationship_score)
    .slice(0, 8)

  const changeFilter = (field, value) => {
    setError('')
    setFilters((current) => {
      if (field === 'organism') {
        const firstForOrganism = forecasts.find((row) => row.organism === value)
        return {
          organism: value,
          ward: firstForOrganism?.ward || '',
          antibiotic: firstForOrganism?.antibiotic || '',
        }
      }
      if (field === 'ward') {
        const firstForWard = forecasts.find(
          (row) => row.organism === current.organism && row.ward === value,
        )
        return {
          ...current,
          ward: value,
          antibiotic: firstForWard?.antibiotic || '',
        }
      }
      return { ...current, [field]: value }
    })
  }

  if (loading) {
    return <main className="loading-screen">Loading AMR surveillance data…</main>
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="AMR surveillance dashboard home">
          <span className="brand-mark">+</span>
          <span>Sentinel<span className="brand-light">AMR</span></span>
        </a>
        <div className="header-meta">
          <span className="header-date">Surveillance workspace</span>
        </div>
      </header>

      <section className="page-intro" id="top">
        <div>
          <p className="eyebrow">HOSPITAL SURVEILLANCE · FORECASTING</p>
          <h1>AMR Surveillance &amp;<br className="mobile-break" /> Resistance Forecasting</h1>
          <p className="subtitle">Hospital-level antimicrobial resistance intelligence</p>
        </div>
        <div className="intro-note">
          <span className="note-icon">i</span>
          <p>Forecasts are prototype surveillance signals, not clinical guidance.</p>
        </div>
      </section>

      {error && (
        <div className="error-banner" role="alert">
          <strong>Data request failed</strong>
          <span>{error}. Confirm the API is running at http://localhost:8000.</span>
        </div>
      )}

      <section className="filter-panel" aria-label="Forecast filters">
        <div className="section-caption"><span className="caption-index">01</span> ANALYSIS SCOPE</div>
        <div className="filter-grid">
          <label>
            <span>Organism</span>
            <select value={filters.organism} onChange={(event) => changeFilter('organism', event.target.value)}>
              {organisms.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>
            <span>Ward</span>
            <select value={filters.ward} onChange={(event) => changeFilter('ward', event.target.value)}>
              {wards.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>
            <span>Antibiotic</span>
            <select value={filters.antibiotic} onChange={(event) => changeFilter('antibiotic', event.target.value)}>
              {antibiotics.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="content-grid trend-grid">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <p className="section-caption"><span className="caption-index">02</span> RESISTANCE TREND</p>
              <h2>Historical trajectory</h2>
              <p className="panel-subtitle">{filters.organism} · {filters.ward} · {filters.antibiotic}</p>
            </div>
          </div>
          <ResistanceChart rows={history} forecast={selectedForecast} />
        </article>
      </section>

      <section className="content-grid lower-grid">
        <article className="panel risks-panel">
          <div className="panel-heading">
            <div>
              <p className="section-caption"><span className="caption-index">04</span> SURVEILLANCE WATCHLIST</p>
              <h2>Priority resistance signals</h2>
            </div>
            <span className="record-count">{risks.length} signals</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Organism</th><th>Ward</th><th>Antibiotic</th><th>Current</th><th>Forecast</th><th>Change</th><th>Signal</th></tr>
              </thead>
              <tbody>
                {risks.slice(0, 10).map((row) => (
                  <tr key={`${row.organism}-${row.ward}-${row.antibiotic}`}>
                    <td className="organism-cell">{row.organism}</td>
                    <td>{row.ward}</td>
                    <td>{row.antibiotic}</td>
                    <td>{formatPercent(row.current_resistance)}</td>
                    <td>{formatPercent(row.predicted_next_month_resistance)}</td>
                    <td className={row.change_percentage_points > 0 ? 'text-amber' : 'text-green'}>{formatChange(row.change_percentage_points)}</td>
                    <td><RiskBadge level={row.risk_level} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel relationship-panel">
          <div className="panel-heading">
            <div>
              <p className="section-caption"><span className="caption-index">05</span> ANTIBIOTIC ASSOCIATIONS</p>
              <h2>Observed relationships</h2>
            </div>
          </div>
          <p className="panel-subtitle">Predictive associations for the selected organism and ward. These do not indicate causation.</p>
          <div className="relationship-list">
            {selectedRelationships.length ? selectedRelationships.map((row, index) => (
              <div
                className="relationship-row"
                key={`${row.source_antibiotic}-${row.target_antibiotic}`}
                style={{ '--association-color': associationColors[index % associationColors.length] }}
              >
                <div className="relationship-pair">
                  <strong>{row.source_antibiotic}</strong>
                  <span>↔</span>
                  <strong>{row.target_antibiotic}</strong>
                </div>
                <div className="relationship-meta">
                  <span>Score <b>{(Number(row.combined_relationship_score) * 100).toFixed(1)}%</b></span>
                  <span>{row.evidence_level} evidence</span>
                </div>
                <span className="association-track">
                  <i style={{ width: `${Math.max(0, Math.min(100, Number(row.combined_relationship_score) * 100))}%` }} />
                </span>
              </div>
            )) : <div className="empty-state">No relationship evidence for this selection.</div>}
          </div>
        </article>
      </section>

      <section className="dashboard-footnote">
        <div className="footnote-mark">!</div>
        <p>
          <strong>Interpret with care.</strong> This is a prototype surveillance dashboard,
          not clinically validated. Risk thresholds are alert rules only; predictions are
          not clinical recommendations. Observed antibiotic relationships do not prove
          causation. External validation is required before real-world deployment.
        </p>
      </section>

      <footer className="footer">
        <span>SentinelAMR <span className="footer-dot">·</span> Surveillance prototype</span>
        <span>{summary ? `${summary.total_organisms} organisms · ${summary.total_wards} wards · ${summary.total_antibiotics} antibiotics` : ''}</span>
      </footer>
    </main>
  )
}

export default App
