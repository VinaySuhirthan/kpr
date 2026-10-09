import { useState } from 'react';
import { FileDown, FileText, Code, Loader2, CheckCircle2, FileCheck } from 'lucide-react';
import { Button } from '../common/Button';
import { amrApi } from '../../services/amrApi';
import { generateAmrPDF } from '../../utils/generatePDF';

export function DownloadResults({ analysisId, resultsCount, analysisResult }) {
  const [pdfState, setPdfState] = useState('idle');

  if (!analysisId) return null;

  const csvUrl = amrApi.getCsvDownloadUrl(analysisId);
  const jsonUrl = amrApi.getJsonDownloadUrl(analysisId);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem 0' }}>
      <div>
        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Export & Download Analysis Outputs
        </h4>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Download validated annotations and surveillance summaries for analysis job{' '}
          <code style={{ fontFamily: 'var(--font-mono)', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
            {analysisId}
          </code>
          .
        </p>
      </div>

      {/* Primary Action Card: Complete PDF Surveillance Report */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #f0fdfa, #e6fffa)',
        border: '1.5px solid #0d9488',
        boxShadow: '0 4px 14px rgba(13, 148, 136, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: '#0d9488',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <FileDown size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
              Official AMR Surveillance Report (PDF)
            </div>
            <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>
              Includes executive cover, statistical dashboard, color-coded gene table, and clinical recommendations.
            </div>
          </div>
        </div>

        <button
          id="download-results-tab-pdf-btn"
          onClick={handleDownloadPDF}
          disabled={!analysisResult || pdfState === 'loading'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.6rem',
            background: pdfState === 'done' ? '#16a34a' : 'linear-gradient(135deg, #0d9488, #0f766e)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: !analysisResult || pdfState === 'loading' ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(13,148,136,0.3)',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          {pdfState === 'loading' ? (
            <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Generating PDF…</>
          ) : pdfState === 'done' ? (
            <><CheckCircle2 size={18} /> Downloaded!</>
          ) : (
            <><FileCheck size={18} /> Download Full PDF Report</>
          )}
        </button>
      </div>

      {/* Raw Data Downloads: CSV and JSON */}
      <div>
        <h5 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          Raw Computational Data
        </h5>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <a href={csvUrl} download={`amr_results_${analysisId}.csv`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" icon={<FileText size={18} />}>
              Download Results as CSV ({resultsCount} rows)
            </Button>
          </a>

          <a href={jsonUrl} download={`amr_results_${analysisId}.json`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" icon={<Code size={18} />}>
              Download Full JSON Output
            </Button>
          </a>
        </div>
      </div>

      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Total exportable entries: <strong>{resultsCount}</strong> · Verified with NCBI AMRFinderPlus v4.0
      </div>
    </div>
  );
}
