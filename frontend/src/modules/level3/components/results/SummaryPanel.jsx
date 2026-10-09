import { useState } from 'react';
import { FileDown, Loader2, CheckCircle2 } from 'lucide-react';
import { generateAmrPDF } from '../../utils/generatePDF';

export function SummaryPanel({ summary, inputMeta, analysisResult }) {
  const [pdfState, setPdfState] = useState('idle'); // idle | loading | done

  if (!summary) return null;

  const stats = [
    { label: 'Total Sequences Analyzed', value: summary.total_sequences,     desc: 'DNA records processed' },
    { label: 'Total Contigs',            value: summary.total_contigs,         desc: 'Genomic contigs screened' },
    { label: 'Total AMR Hits',           value: summary.total_amr_hits,        desc: 'Confirmed AMR gene matches', highlight: summary.total_amr_hits > 0 },
    { label: 'Unique AMR Genes',         value: summary.unique_genes,          desc: 'Distinct gene families found', highlight: summary.unique_genes > 0 },
    { label: 'Number of Isolates',       value: summary.number_of_isolates,    desc: 'Bacterial samples analyzed' },
    { label: 'Detected Mechanisms',      value: summary.number_of_mechanisms,  desc: 'Resistance mechanism types', highlight: summary.number_of_mechanisms > 0 },
  ];

  const handleDownloadPDF = async () => {
    if (!analysisResult || pdfState === 'loading') return;
    setPdfState('loading');
    try {
      await generateAmrPDF(analysisResult);
      setPdfState('done');
      setTimeout(() => setPdfState('idle'), 3000);
    } catch (err) {
      console.error('PDF generation failed:', err);
      setPdfState('idle');
      alert(`PDF generation failed: ${err.message || 'Please try again.'}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Stat cards */}
      <div className="summary-grid">
        {stats.map((st, i) => (
          <div key={i} className="stat-card" style={st.highlight ? { borderColor: '#0d9488', boxShadow: '0 0 0 2px #ccfbf1' } : {}}>
            <span className="stat-label">{st.label}</span>
            <span className="stat-value" style={st.highlight ? { color: '#0d9488' } : {}}>{st.value}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{st.desc}</span>
          </div>
        ))}
      </div>

      {/* Input dataset info */}
      {inputMeta && (
        <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
          <strong>Input Dataset:</strong> {inputMeta.filename} ({inputMeta.format?.toUpperCase() || 'CSV'}, {inputMeta.sequences} sequences across {inputMeta.isolates} isolate(s))
        </div>
      )}

      {/* AST Phenotype Concordance Highlight */}
      {analysisResult?.ast_concordance && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #f0fdfa, #ccfbf1)',
          border: '1px solid #14b8a6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f766e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🎯 AST Phenotype Validation: {analysisResult.ast_concordance.concordance_rate}% Concordance
            </div>
            <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '2px' }}>
              {analysisResult.ast_concordance.matches} of {analysisResult.ast_concordance.total_evaluated} isolates show direct genotype-phenotype concordance ({analysisResult.ast_concordance.mismatches} discrepancy identified).
            </div>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, background: '#0d9488', color: '#fff', padding: '4px 10px', borderRadius: '6px' }}>
            AST Column Detected
          </span>
        </div>
      )}

      {/* ─── Download PDF button ──────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              📄 Export Full Report
            </h4>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Download a complete, researcher-ready PDF with cover page, statistical summary, gene table, and recommendations.
            </p>
          </div>

          <button
            id="download-pdf-btn"
            onClick={handleDownloadPDF}
            disabled={!analysisResult || pdfState === 'loading'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.4rem',
              background: pdfState === 'done'
                ? 'linear-gradient(135deg, #16a34a, #15803d)'
                : 'linear-gradient(135deg, #0d9488, #0f766e)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: !analysisResult || pdfState === 'loading' ? 'not-allowed' : 'pointer',
              opacity: !analysisResult ? 0.5 : 1,
              transition: 'all 0.2s',
              boxShadow: '0 4px 14px rgba(13,148,136,0.4)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {pdfState === 'loading' ? (
              <><Loader2 size={16} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} /> Generating PDF…</>
            ) : pdfState === 'done' ? (
              <><CheckCircle2 size={16} /> Downloaded!</>
            ) : (
              <><FileDown size={16} /> Download PDF Report</>
            )}
          </button>
        </div>

        {/* What's inside preview */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '0.5rem',
        }}>
          {[
            { icon: '🎯', title: 'Cover Page',     desc: 'Key stats at a glance + dataset info' },
            { icon: '📊', title: 'Summary Stats',  desc: 'Explained metrics & clinical note' },
            { icon: '🔬', title: 'Gene Findings',  desc: 'Colour-coded identity & coverage table' },
            { icon: '📈', title: 'Breakdown',      desc: 'Gene frequency & per-isolate profiles' },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '0.6rem 0.75rem',
              background: 'var(--bg-surface, #f8fafc)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
