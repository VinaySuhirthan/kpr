import { CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle, Activity, Info } from 'lucide-react';
import { Badge } from '../common/Badge';

export function AstValidationTab({ astConcordance }) {
  if (!astConcordance) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <HelpCircle size={36} style={{ margin: '0 auto 0.75rem', color: '#94a3b8' }} />
        <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>No AST Phenotype Data Provided</h4>
        <p style={{ margin: 0, fontSize: '0.9rem', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
          To enable Genotype vs Phenotype Concordance Validation, include an <code>ast_phenotype</code> column (e.g. <em>Resistant</em>, <em>Susceptible</em>) in your uploaded genomic CSV dataset.
        </p>
      </div>
    );
  }

  const {
    total_evaluated,
    matches,
    mismatches,
    concordance_rate,
    true_positives,
    true_negatives,
    false_positives,
    false_negatives,
    sensitivity,
    specificity,
    items = []
  } = astConcordance;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem 0' }}>
      
      {/* ─── Top Metric Banner ────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        color: '#fff',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.25)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.25rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2dd4bf', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            <Activity size={16} /> AST Phenotype Validation Across Genomic Calls
          </div>
          <h3 style={{ margin: '0.4rem 0 0.2rem', fontSize: '1.4rem', fontWeight: 800 }}>
            {concordance_rate}% Concordance Rate
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
            {matches} of {total_evaluated} isolates exhibit direct correlation between laboratory AST phenotype and AMRFinderPlus genomic profile.
          </p>
        </div>

        {/* Mini stats row */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '0.6rem 1rem', borderRadius: '8px', textAlign: 'center', minWidth: '90px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4ade80' }}>{matches}</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Matches</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '0.6rem 1rem', borderRadius: '8px', textAlign: 'center', minWidth: '90px' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: mismatches > 0 ? '#f87171' : '#4ade80' }}>{mismatches}</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Mismatches</div>
          </div>
          {sensitivity != null && (
            <div style={{ background: 'rgba(255,255,255,0.08)', padding: '0.6rem 1rem', borderRadius: '8px', textAlign: 'center', minWidth: '90px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#38bdf8' }}>{sensitivity}%</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Sensitivity</div>
            </div>
          )}
          {specificity != null && (
            <div style={{ background: 'rgba(255,255,255,0.08)', padding: '0.6rem 1rem', borderRadius: '8px', textAlign: 'center', minWidth: '90px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#a78bfa' }}>{specificity}%</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Specificity</div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Classification Cards ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
        <div style={{ padding: '0.85rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#166534' }}>True Positives (Resistant Match)</span>
            <span style={{ fontWeight: 800, color: '#166534', fontSize: '1.1rem' }}>{true_positives}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: '2px' }}>Carries AMR genes + Phenotypically resistant</div>
        </div>

        <div style={{ padding: '0.85rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#166534' }}>True Negatives (Susceptible Match)</span>
            <span style={{ fontWeight: 800, color: '#166534', fontSize: '1.1rem' }}>{true_negatives}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: '2px' }}>No AMR genes + Phenotypically susceptible</div>
        </div>

        <div style={{ padding: '0.85rem 1rem', background: false_negatives > 0 ? '#fef2f2' : '#f8fafc', border: `1px solid ${false_negatives > 0 ? '#fecaca' : '#e2e8f0'}`, borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: false_negatives > 0 ? '#991b1b' : '#64748b' }}>Major Discrepancies (False Neg)</span>
            <span style={{ fontWeight: 800, color: false_negatives > 0 ? '#dc2626' : '#64748b', fontSize: '1.1rem' }}>{false_negatives}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: '2px' }}>Phenotype resistant, no known acquired AMR gene</div>
        </div>

        <div style={{ padding: '0.85rem 1rem', background: false_positives > 0 ? '#fffbeb' : '#f8fafc', border: `1px solid ${false_positives > 0 ? '#fde68a' : '#e2e8f0'}`, borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: false_positives > 0 ? '#92400e' : '#64748b' }}>Minor Discrepancies (False Pos)</span>
            <span style={{ fontWeight: 800, color: false_positives > 0 ? '#d97706' : '#64748b', fontSize: '1.1rem' }}>{false_positives}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: '2px' }}>Carries gene but phenotypically susceptible (silent)</div>
        </div>
      </div>

      {/* ─── Detailed Concordance Table ─────────────────────────────────── */}
      <div className="table-responsive">
        <table className="data-table" aria-label="AST Genotype vs Phenotype Concordance Table">
          <thead>
            <tr>
              <th>#</th>
              <th>Isolate ID</th>
              <th>Laboratory AST Phenotype</th>
              <th>Genomic Call (AMRFinderPlus)</th>
              <th>Detected Determinants</th>
              <th>Concordance Status</th>
              <th>Clinical & Biological Interpretation</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row, idx) => {
              const isMatch = row.status === 'MATCH';
              const isResistant = row.ast_phenotype?.toLowerCase() === 'resistant';
              const isGenotypeRes = row.genotype_call === 'Resistant';

              return (
                <tr key={row.isolate_id} style={{ background: !isMatch ? '#fff5f5' : undefined }}>
                  <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{row.isolate_id}</td>
                  <td>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: isResistant ? '#fee2e2' : '#dcfce7',
                      color: isResistant ? '#b91c1c' : '#15803d'
                    }}>
                      {row.ast_phenotype}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: isGenotypeRes ? '#fee2e2' : '#dcfce7',
                      color: isGenotypeRes ? '#b91c1c' : '#15803d'
                    }}>
                      {isGenotypeRes ? 'AMR Positive' : 'AMR Negative'}
                    </span>
                  </td>
                  <td>
                    {row.detected_genes && row.detected_genes.length > 0 ? (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {row.detected_genes.map(g => (
                          <Badge key={g} variant="gene">{g}</Badge>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>None detected</span>
                    )}
                  </td>
                  <td>
                    {isMatch ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 9px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: '#dcfce7',
                        color: '#166534'
                      }}>
                        <CheckCircle2 size={13} /> MATCH
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 9px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: '#fee2e2',
                        color: '#991b1b'
                      }}>
                        <AlertTriangle size={13} /> MISMATCH
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: isMatch ? 'var(--text-secondary)' : '#991b1b', maxWidth: '300px' }}>
                    {row.interpretation}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── Biological Explanation Box ──────────────────────────────────── */}
      <div style={{
        padding: '1rem 1.25rem',
        borderRadius: '8px',
        background: '#f8fafc',
        border: '1px solid var(--border-subtle)',
        fontSize: '0.82rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.5
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
          <Info size={15} style={{ color: '#0d9488' }} /> Clinical Note on Genotype vs Phenotype Concordance
        </div>
        <p style={{ margin: '0 0 0.35rem' }}>
          • <strong>Concordance Matches</strong> demonstrate reliable agreement between whole-genome alignment and in-vitro disk diffusion/MIC assays.
        </p>
        <p style={{ margin: '0 0 0.35rem' }}>
          • <strong>Major Discrepancies (Phenotype Resistant, Genotype Susceptible)</strong> can indicate novel enzymatic variants, membrane porin loss, active multidrug efflux hyper-expression, or unmodeled chromosomal point mutations.
        </p>
        <p style={{ margin: 0 }}>
          • <strong>Minor Discrepancies (Phenotype Susceptible, Genotype Resistant)</strong> typically reflect silent genes with disabled promoters, truncated pseudogenes, or suboptimal in-vitro induction conditions.
        </p>
      </div>

    </div>
  );
}
