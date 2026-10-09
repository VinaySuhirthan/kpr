import React from 'react';
import { Link2, Check, AlertTriangle, Minus } from 'lucide-react';

export default function GenotypePhenotypeSummaryCard({ summaryRows, concordanceLevel }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <span className="card-title-icon">
            <Link2 size={16} />
          </span>
          <span className="card-title">Genotype ↔ Phenotype Summary</span>
        </div>
        <span className="badge-analyzed">{concordanceLevel || '—'}</span>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Antibiotic / Class</th>
            <th>Genetic Evidence</th>
            <th>AST Result</th>
            <th>Interpretation</th>
            <th>ML Prediction</th>
          </tr>
        </thead>
        <tbody>
          {summaryRows.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                No AST data available for this isolate.
              </td>
            </tr>
          )}
          {summaryRows.map((row) => {
            const isResistantAST = row.astResultCode === 'R';
            const isConsistent = row.interpretation === 'Consistent';
            const isMismatch = row.interpretation === 'Possible Mismatch';

            const mlResistant = row.mlPrediction === 'Resistant';
            const mlAvailable = row.mlPrediction !== null;

            return (
              <tr key={row.id}>
                <td>
                  <div>
                    <strong>{row.antibiotic}</strong>
                    <br />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      ({row.class})
                    </span>
                  </div>
                </td>

                <td>
                  <span
                    className="gene-name"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: row.geneticEvidence === 'None detected'
                        ? 'var(--text-muted)'
                        : 'var(--text-primary)',
                      fontStyle: row.geneticEvidence === 'None detected' ? 'italic' : 'normal',
                    }}
                  >
                    {row.geneticEvidence}
                  </span>
                </td>

                <td>
                  <span className={`code-box ${isResistantAST ? 'R' : 'S'}`}>
                    {row.astResultCode}
                  </span>
                </td>

                <td>
                  {isConsistent ? (
                    <span className="interpretation-badge">
                      <Check size={12} />
                      <span>{row.interpretation}</span>
                    </span>
                  ) : isMismatch ? (
                    <span className="interpretation-badge mismatch">
                      <AlertTriangle size={12} />
                      <span>{row.interpretation}</span>
                    </span>
                  ) : (
                    <span className="interpretation-badge neutral">
                      <Minus size={12} />
                      <span>{row.interpretation}</span>
                    </span>
                  )}
                </td>

                <td>
                  {mlAvailable ? (
                    <div>
                      <span className={`result-badge ${mlResistant ? 'resistant' : 'susceptible'}`}>
                        <span className={`dot-indicator ${mlResistant ? 'dot-resistant' : 'dot-susceptible'}`} />
                        {row.mlPrediction}
                      </span>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                        p={row.mlProbability?.toFixed(3)}
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No model
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
