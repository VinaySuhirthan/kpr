import React from 'react';
import { X, Dna, FileText } from 'lucide-react';

export default function FullGenomeModal({ isOpen, onClose, isolateData }) {
  if (!isOpen || !isolateData) return null;

  const genomeSizeMb = isolateData.genomeSizeMb;
  const genomeBp = genomeSizeMb ? Math.round(genomeSizeMb * 1_000_000).toLocaleString() : '—';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="card-title-group">
            <Dna size={20} style={{ color: 'var(--brand-green-text)' }} />
            <h3 className="modal-title">
              Full Genome Overview – {isolateData.organism} ({isolateData.isolateId})
            </h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="grid-2-col">
            {/* Assembly Details */}
            <div className="card" style={{ boxShadow: 'none', background: '#f9fafb' }}>
              <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px' }}>
                Assembly Details
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div>
                  <strong>Assembly Status:</strong>{' '}
                  {/* PLACEHOLDER '—' if not available */}
                  {isolateData.assembly || '—'}
                </div>
                <div>
                  <strong>Genome Size:</strong>{' '}
                  {genomeSizeMb ? `${genomeSizeMb} Mb (${genomeBp} bp)` : '—'}
                </div>
                <div>
                  {/* PLACEHOLDER: GC% not included in current API response */}
                  <strong>GC Content:</strong> —
                </div>
                <div>
                  {/* PLACEHOLDER: Contig count not available in current dataset */}
                  <strong>Contigs Count:</strong> —
                </div>
              </div>
            </div>

            {/* AMR Annotation Summary */}
            <div className="card" style={{ boxShadow: 'none', background: '#f9fafb' }}>
              <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px' }}>
                AMR Annotation Summary
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div>
                  <strong>AMR Determinants Detected:</strong>{' '}
                  {isolateData.stats?.amrGenesDetected ?? '—'}
                </div>
                <div>
                  <strong>Resistance Mutations:</strong>{' '}
                  {isolateData.stats?.resistanceMutations ?? '—'}
                </div>
                <div>
                  <strong>Antibiotics Tested:</strong>{' '}
                  {isolateData.stats?.antibioticsTested ?? '—'}
                </div>
                <div>
                  {/* PLACEHOLDER: CARD DB version not tracked in current pipeline */}
                  <strong>CARD Database Version:</strong> —
                </div>
              </div>
            </div>
          </div>

          {/* Annotated Genomic Coordinates */}
          <div style={{ marginTop: '12px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} />
              Detected Resistance Determinants
            </h4>

            {isolateData.findings && isolateData.findings.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Feature Name</th>
                    <th>Type</th>
                    <th>Associated Resistance</th>
                    <th>Genomic Location</th>
                  </tr>
                </thead>
                <tbody>
                  {isolateData.findings.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.gene}</strong></td>
                      <td>
                        <span className={`type-badge ${item.type === 'AMR Gene' ? 'amr-gene' : 'mutation'}`}>
                          {item.type}
                        </span>
                      </td>
                      <td>{item.associatedResistance || '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '11px' }}>
                        {/* PLACEHOLDER: Exact genomic coordinates not in current dataset */}
                        Location unavailable
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              /* PLACEHOLDER: No detected resistance determinants for this isolate */
              <div className="empty-table-state">
                <p>No detected resistance determinants available for this isolate.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
