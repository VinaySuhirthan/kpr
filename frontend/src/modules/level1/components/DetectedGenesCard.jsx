import React from 'react';
import { CircleDot } from 'lucide-react';

export default function DetectedGenesCard({ findings }) {
  const hasFindings = findings && findings.length > 0;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <span className="card-title-icon"><CircleDot size={16} /></span>
          <span className="card-title">Detected AMR Genes &amp; Mutations</span>
        </div>
        <span className="card-count">{hasFindings ? `${findings.length} findings` : '0 findings'}</span>
      </div>

      {!hasFindings ? (
        <div className="empty-table-state">
          <p>No AMR genes or resistance mutations detected for this isolate.</p>
          <p className="empty-hint">
            This may indicate the isolate has no annotated resistance determinants in the current dataset.
          </p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Gene / Mutation</th>
              <th>Location (Genome)</th>
              <th>Associated Resistance</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((item) => {
              const isAmr = item.type === 'AMR Gene';
              return (
                <tr key={item.id}>
                  <td>
                    <span className={`type-badge ${isAmr ? 'amr-gene' : 'mutation'}`}>
                      {item.type}
                    </span>
                  </td>
                  <td>
                    <span className="gene-name">{item.gene}</span>
                  </td>
                  <td>
                    <div className="location-text">
                      {item.location === 'Location unavailable' ? (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Location unavailable
                        </span>
                      ) : (
                        item.location
                      )}
                    </div>
                  </td>
                  <td>
                    <strong>
                      {item.associatedResistance === '—' ? (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      ) : (
                        item.associatedResistance
                      )}
                    </strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
