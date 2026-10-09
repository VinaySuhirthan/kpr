import React from 'react';
import { FlaskConical } from 'lucide-react';

export default function AstPhenotypeCard({ astResults }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <span className="card-title-icon">
            <FlaskConical size={16} />
          </span>
          <span className="card-title">AST Phenotype (Laboratory Results)</span>
        </div>
        <span className="card-count">{astResults.length} Tests</span>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Antibiotic</th>
            <th>Class</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {astResults.map((row) => {
            const isResistant = row.code === 'R' || row.result.includes('Resistant');
            return (
              <tr key={row.id}>
                <td>
                  <strong>{row.antibiotic}</strong>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{row.class}</td>
                <td>
                  <span
                    className={`result-badge ${
                      isResistant ? 'resistant' : 'susceptible'
                    }`}
                  >
                    <span
                      className={`dot-indicator ${
                        isResistant ? 'dot-resistant' : 'dot-susceptible'
                      }`}
                    />
                    {row.result}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
