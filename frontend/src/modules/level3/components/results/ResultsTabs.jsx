import { useState } from 'react';
import { AmrGenesTable } from './AmrGenesTable';
import { SummaryPanel } from './SummaryPanel';
import { GenomeVisualization } from './GenomeVisualization';
import { DownloadResults } from './DownloadResults';
import { AstValidationTab } from './AstValidationTab';

export function ResultsTabs({ analysisResult }) {
  const [activeTab, setActiveTab] = useState('genes');

  if (!analysisResult) return null;

  const { results, summary, visualization_tracks, analysis_id, input, ast_concordance } = analysisResult;

  return (
    <div>
      <div className="tab-nav" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'genes'}
          className={`tab-btn ${activeTab === 'genes' ? 'active' : ''}`}
          onClick={() => setActiveTab('genes')}
        >
          Detected AMR Genes ({results?.length || 0})
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'summary'}
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        {ast_concordance && (
          <button
            role="tab"
            aria-selected={activeTab === 'ast'}
            className={`tab-btn ${activeTab === 'ast' ? 'active' : ''}`}
            onClick={() => setActiveTab('ast')}
            style={activeTab === 'ast' ? { borderColor: '#0d9488', color: '#0d9488', fontWeight: 700 } : {}}
          >
            🎯 AST Phenotype Validation ({ast_concordance.concordance_rate}% Match)
          </button>
        )}
        <button
          role="tab"
          aria-selected={activeTab === 'visualization'}
          className={`tab-btn ${activeTab === 'visualization' ? 'active' : ''}`}
          onClick={() => setActiveTab('visualization')}
        >
          Visualization ({visualization_tracks?.length || 0} tracks)
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'download'}
          className={`tab-btn ${activeTab === 'download' ? 'active' : ''}`}
          onClick={() => setActiveTab('download')}
        >
          Download Results
        </button>
      </div>

      <div style={{ marginTop: '1.25rem' }}>
        {activeTab === 'genes' && <AmrGenesTable results={results} />}
        {activeTab === 'summary' && <SummaryPanel summary={summary} inputMeta={input} analysisResult={analysisResult} />}
        {activeTab === 'ast' && <AstValidationTab astConcordance={ast_concordance} />}
        {activeTab === 'visualization' && (
          <GenomeVisualization tracks={visualization_tracks} results={results} />
        )}
        {activeTab === 'download' && (
          <DownloadResults analysisId={analysis_id} resultsCount={results?.length || 0} analysisResult={analysisResult} />
        )}
      </div>
    </div>
  );
}
