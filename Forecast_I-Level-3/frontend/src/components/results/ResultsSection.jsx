import { useState } from 'react';
import { Card } from '../common/Card';
import { ResultsTabs } from './ResultsTabs';
import { EmptyState } from '../common/EmptyState';
import { ShieldCheck, FileDown, Loader2, CheckCircle2 } from 'lucide-react';
import { generateAmrPDF } from '../../utils/generatePDF';

export function ResultsSection({ analysisResult, status }) {
  const [headerPdfState, setHeaderPdfState] = useState('idle');

  if (status !== 'success' || !analysisResult) {
    return (
      <Card>
        <div className="results-header-row">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>AMR Detection Results</h3>
        </div>
        <EmptyState
          icon={<ShieldCheck className="empty-box-icon" />}
          title="No Analysis Results Yet"
          message="Upload genomic sequences above and click 'Run AMR Analysis' to execute NCBI AMRFinderPlus."
        />
      </Card>
    );
  }

  const handleHeaderDownloadPDF = async () => {
    if (headerPdfState === 'loading') return;
    setHeaderPdfState('loading');
    try {
      await generateAmrPDF(analysisResult);
      setHeaderPdfState('done');
      setTimeout(() => setHeaderPdfState('idle'), 3000);
    } catch (err) {
      console.error('PDF error:', err);
      setHeaderPdfState('idle');
      alert(`PDF generation failed: ${err.message || 'Please try again.'}`);
    }
  };

  return (
    <Card>
      <div className="results-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>AMR Detection Results</h3>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Analysis Job ID: {analysisResult.analysis_id}
          </span>
        </div>

        <button
          id="header-download-pdf-btn"
          onClick={handleHeaderDownloadPDF}
          disabled={headerPdfState === 'loading'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.5rem 1.1rem',
            background: headerPdfState === 'done' ? '#16a34a' : 'linear-gradient(135deg, #0d9488, #0f766e)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.84rem',
            cursor: headerPdfState === 'loading' ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(13,148,136,0.3)',
            transition: 'all 0.2s',
          }}
        >
          {headerPdfState === 'loading' ? (
            <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
          ) : headerPdfState === 'done' ? (
            <><CheckCircle2 size={15} /> Downloaded!</>
          ) : (
            <><FileDown size={15} /> Export PDF Report</>
          )}
        </button>
      </div>

      <ResultsTabs analysisResult={analysisResult} />
    </Card>
  );
}
