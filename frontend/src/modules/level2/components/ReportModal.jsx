import { useMemo } from 'react'
import { createPortal } from 'react-dom'

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString()
}

function ReportModal({
  periods = [],
  combinedData,
  comparison,
  alerts = [],
  trendResults = [],
  onClose,
}) {
  const masterData = combinedData || periods[0]

  const topRisks = useMemo(() => {
    return [...trendResults]
      .filter((r) => r.trendStatus === 'Increasing')
      .sort((a, b) => b.trendSlope - a.trendSlope)
      .slice(0, 8)
  }, [trendResults])

  const pathogenSummary = useMemo(() => {
    if (!masterData) return []
    const groups = {}
    masterData.rows.forEach((r) => {
      if (!groups[r.organism]) {
        groups[r.organism] = { total: 0, resistant: 0, susceptible: 0 }
      }
      groups[r.organism].total += 1
      if (r.ast_result === 'R') groups[r.organism].resistant += 1
      if (r.ast_result === 'S') groups[r.organism].susceptible += 1
    })

    return Object.entries(groups).map(([organism, stats]) => ({
      organism,
      total: stats.total,
      rate: stats.resistant + stats.susceptible > 0
        ? (stats.resistant / (stats.resistant + stats.susceptible)) * 100
        : 0,
    })).sort((a, b) => b.rate - a.rate)
  }, [masterData])

  const antibioticSummary = useMemo(() => {
    if (!masterData) return []
    const groups = {}
    masterData.rows.forEach((r) => {
      if (!groups[r.antibiotic]) {
        groups[r.antibiotic] = { total: 0, resistant: 0, susceptible: 0 }
      }
      groups[r.antibiotic].total += 1
      if (r.ast_result === 'R') groups[r.antibiotic].resistant += 1
      if (r.ast_result === 'S') groups[r.antibiotic].susceptible += 1
    })

    return Object.entries(groups).map(([antibiotic, stats]) => ({
      antibiotic,
      total: stats.total,
      rate: stats.resistant + stats.susceptible > 0
        ? (stats.resistant / (stats.resistant + stats.susceptible)) * 100
        : 0,
    })).sort((a, b) => b.rate - a.rate)
  }, [masterData])

  const wardSummary = useMemo(() => {
    if (!masterData) return []
    const groups = {}
    masterData.rows.forEach((r) => {
      if (!groups[r.ward]) {
        groups[r.ward] = { total: 0, resistant: 0, susceptible: 0 }
      }
      groups[r.ward].total += 1
      if (r.ast_result === 'R') groups[r.ward].resistant += 1
      if (r.ast_result === 'S') groups[r.ward].susceptible += 1
    })

    return Object.entries(groups).map(([ward, stats]) => ({
      ward,
      total: stats.total,
      rate: stats.resistant + stats.susceptible > 0
        ? (stats.resistant / (stats.resistant + stats.susceptible)) * 100
        : 0,
    })).sort((a, b) => b.rate - a.rate)
  }, [masterData])

  if (!masterData) return null

  return createPortal(
    <div className="report-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-actions-bar no-print">
          <div className="report-badge">AMR EXECUTIVE SURVEILLANCE REPORT (3 PAGES)</div>
          <div className="report-buttons-group">
            <button className="report-print-btn" onClick={() => window.print()}>
              🖨️ Print / Save as PDF
            </button>
            <button className="report-close-btn" onClick={onClose}>
              ✕ Close
            </button>
          </div>
        </div>

        <div className="report-document">
          <section className="report-page page-1">
            <header className="report-header">
              <div className="report-title-area">
                <span className="report-kicker">CLINICAL ANTIMICROBIAL RESISTANCE SURVEILLANCE</span>
                <h1>Executive AMR Summary Report</h1>
                <p>Comprehensive Multi-Period Epidemiological Trend &amp; Risk Analysis</p>
              </div>
              <div className="report-meta-box">
                <div><strong>Generated:</strong> {new Date().toLocaleDateString()}</div>
                <div><strong>Status:</strong> Active Surveillance</div>
                <div><strong>Connected Datasets:</strong> {periods.length} Files</div>
              </div>
            </header>

            <div className="report-section">
              <h3 className="section-heading">1. Ingestion Scope &amp; Connected Datasets</h3>
              <div className="report-chips-list">
                {periods.map((p, idx) => (
                  <div className="report-period-pill" key={p.id}>
                    <strong>Dataset {idx + 1}:</strong> {p.name} ({p.metrics.total.toLocaleString()} isolates)
                  </div>
                ))}
              </div>
            </div>

            <div className="report-section">
              <h3 className="section-heading">2. Core Epidemiological Indicators</h3>
              <div className="report-metrics-grid">
                <div className="report-metric-card">
                  <span>Overall Resistance Rate</span>
                  <strong>{masterData.metrics.resistanceRate.toFixed(1)}%</strong>
                  <small>S/R Interpretable</small>
                </div>
                <div className="report-metric-card">
                  <span>Total Isolates Analyzed</span>
                  <strong>{masterData.metrics.total.toLocaleString()}</strong>
                  <small>{masterData.metrics.srRecords.length.toLocaleString()} S/R Evaluated</small>
                </div>
                <div className="report-metric-card">
                  <span>Resistant Isolates</span>
                  <strong>{masterData.metrics.resistant.toLocaleString()}</strong>
                  <small>Confirmed R-Class</small>
                </div>
                <div className="report-metric-card">
                  <span>Intermediate (I)</span>
                  <strong>{masterData.metrics.intermediate.toLocaleString()}</strong>
                  <small>Monitored Separately</small>
                </div>
              </div>
            </div>

            <div className="report-section">
              <h3 className="section-heading">3. Departmental / Ward Resistance Distribution</h3>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Hospital Ward / Unit</th>
                    <th>Total Tested</th>
                    <th>Resistance Rate (%)</th>
                    <th>Clinical Risk Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {wardSummary.map((w) => (
                    <tr key={w.ward}>
                      <td><strong>{w.ward}</strong></td>
                      <td>{w.total.toLocaleString()}</td>
                      <td>{w.rate.toFixed(1)}%</td>
                      <td>
                        <span className={`badge ${w.rate >= 50 ? 'increasing' : w.rate >= 35 ? 'stable' : 'decreasing'}`}>
                          {w.rate >= 50 ? 'High Resistance' : w.rate >= 35 ? 'Moderate' : 'Controlled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="report-footer">
              <span>AMR Surveillance Intelligence Platform</span>
              <span>Page 1 of 3</span>
            </footer>
          </section>

          <section className="report-page page-2">
            <header className="report-header sub">
              <div>
                <h2>High-Risk Trends &amp; Early Warning Outbreak Alerts</h2>
                <p>Pathogen-Drug-Department combinations demonstrating accelerated resistance velocities</p>
              </div>
              <div className="report-meta-box">
                <div><strong>Surge Threshold:</strong> ≥10.0 pp</div>
                <div><strong>Critical Alerts:</strong> {alerts.length} Flagged</div>
              </div>
            </header>

            <div className="report-section">
              <h3 className="section-heading">4. Early Warning Alert Matrix (Surges ≥ 10 pp)</h3>
              {alerts.length === 0 ? (
                <p className="muted" style={{ padding: '12px 0' }}>✓ No active outbreak surges exceeding the configured ≥10 percentage point alert threshold.</p>
              ) : (
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Organism</th>
                      <th>Antibiotic</th>
                      <th>Ward</th>
                      <th>Baseline</th>
                      <th>Current</th>
                      <th>Net Shift (Δ)</th>
                      <th>Alert Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert, idx) => (
                      <tr key={idx}>
                        <td><strong>{alert.organism}</strong></td>
                        <td>{alert.antibiotic}</td>
                        <td>{alert.ward}</td>
                        <td>{alert.previousRate !== null ? `${alert.previousRate.toFixed(1)}%` : '-'}</td>
                        <td><strong>{alert.resistanceRate.toFixed(1)}%</strong></td>
                        <td className="change-up">+{alert.change.toFixed(1)} pp</td>
                        <td><span className="badge increasing">OUTBREAK SURGE</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="report-section">
              <h3 className="section-heading">5. Top Increasing Trajectories (Linear Regression Slope)</h3>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Organism</th>
                    <th>Antibiotic</th>
                    <th>Ward</th>
                    <th>Current Rate</th>
                    <th>Trajectory Slope</th>
                    <th>Trajectory Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topRisks.slice(0, 6).map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.organism}</td>
                      <td>{item.antibiotic}</td>
                      <td>{item.ward}</td>
                      <td>{item.resistanceRate.toFixed(1)}%</td>
                      <td><strong>+{item.trendSlope.toFixed(2)} pp/month</strong></td>
                      <td><span className="badge increasing">Increasing</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="report-section">
              <h3 className="section-heading">6. Risk Hotspot Assessment</h3>
              <div className="report-callout warning">
                <strong>Infection Control Alert:</strong> Multiple high-resistance vectors detected in acute critical care and surgical units. Immediate environmental screening and barrier nursing protocol verification recommended.
              </div>
            </div>

            <footer className="report-footer">
              <span>AMR Surveillance Intelligence Platform</span>
              <span>Page 2 of 3</span>
            </footer>
          </section>

          <section className="report-page page-3">
            <header className="report-header sub">
              <div>
                <h2>Pathogen Profiles &amp; Antimicrobial Stewardship</h2>
                <p>Species-level vulnerability, drug susceptibility profiles, and clinical intervention points</p>
              </div>
              <div className="report-meta-box">
                <div><strong>Stewardship:</strong> Active Review</div>
                <div><strong>Timeline:</strong> {formatDate(masterData.metrics.startDate)} – {formatDate(masterData.metrics.endDate)}</div>
              </div>
            </header>

            <div className="report-section">
              <h3 className="section-heading">7. Priority Pathogen Susceptibility Overview</h3>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Target Pathogen</th>
                    <th>Total Tested</th>
                    <th>Resistance Rate (%)</th>
                    <th>Clinical Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {pathogenSummary.map((p) => (
                    <tr key={p.organism}>
                      <td><strong>{p.organism}</strong></td>
                      <td>{p.total.toLocaleString()}</td>
                      <td>{p.rate.toFixed(1)}%</td>
                      <td>
                        <span className={`badge ${p.rate >= 50 ? 'increasing' : 'stable'}`}>
                          {p.rate >= 50 ? 'Critical Priority' : 'Routine Monitoring'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="report-section">
              <h3 className="section-heading">8. Antibiotic Class Vulnerability</h3>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Antimicrobial Drug</th>
                    <th>Isolates Tested</th>
                    <th>Overall Resistance Rate (%)</th>
                    <th>Prescribing Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {antibioticSummary.map((a) => (
                    <tr key={a.antibiotic}>
                      <td>{a.antibiotic}</td>
                      <td>{a.total.toLocaleString()}</td>
                      <td><strong>{a.rate.toFixed(1)}%</strong></td>
                      <td>{a.rate > 45 ? 'Reserve / Restrict Empirical Use' : 'Permitted with Sensitivity Confirmation'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="report-section">
              <h3 className="section-heading">9. Key Antimicrobial Stewardship Committee Action Points</h3>
              <ul className="report-recommendations-list">
                <li><strong>Empirical Guidelines Review:</strong> Restrict monotherapy with antibiotics showing &gt;40% department-level resistance rates.</li>
                <li><strong>Rapid Lab Confirmation:</strong> Accelerate 24h preliminary AST reporting for all ICU admissions with suspected sepsis.</li>
                <li><strong>Barrier Precautions:</strong> Implement contact isolation protocols for all patients colonised with multidrug-resistant isolates.</li>
                <li><strong>Quarterly Stewardship Audit:</strong> Re-audit antibiotic utilization patterns and prescription rationales across surgical and medical wards.</li>
              </ul>
            </div>

            <footer className="report-footer">
              <span>AMR Surveillance Intelligence Platform</span>
              <span>Page 3 of 3</span>
            </footer>
          </section>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ReportModal
