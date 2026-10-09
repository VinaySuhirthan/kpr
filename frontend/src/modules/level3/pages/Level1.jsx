import { Alert } from '../components/common/Alert';
import { UploadTabs } from '../components/upload/UploadTabs';
import { AnalysisOptions } from '../components/analysis/AnalysisOptions';
import { ResultsSection } from '../components/results/ResultsSection';

export function Level1Page({ analysis, upload }) {
  const {
    tool,
    setTool,
    organism,
    setOrganism,
    minIdentity,
    setMinIdentity,
    minCoverage,
    setMinCoverage,
    toolStatus,
    status,
    statusStep,
    analysisResult,
    error,
    runAnalysis
  } = analysis;

  const handleRunClick = () => {
    if (upload.file) {
      runAnalysis(upload.file);
    }
  };

  const isToolAvailable = toolStatus?.available;

  return (
    <>
      <section className="page-header">
        <div className="eyebrow">AMR DETECTION <span>—</span> GENOMIC PROFILING</div>
        <h1 className="page-title">NCBI AMRFinderPlus <span>Gene Detection</span></h1>
        <p className="page-subtitle">
          Upload bacterial genome sequences to automatically identify AMR genes, their genomic locations,
          and annotation details using NCBI AMRFinderPlus.
        </p>
      </section>

      {/* Tool availability warning if AMRFinderPlus executable is missing */}
      {toolStatus && isToolAvailable === false && (
        <Alert
          variant="warning"
          title="NCBI AMRFinderPlus Status Notice"
        >
          {toolStatus.message ||
            'AMRFinderPlus executable was not found. Please install AMRFinderPlus (via Conda/Bioconda or Docker/WSL) and set AMRFINDERPLUS_PATH in backend/.env.'}
        </Alert>
      )}

      {/* Upload Section */}
      <UploadTabs uploadState={upload} />

      {/* Analysis Options Toolbar */}
      <AnalysisOptions
        tool={tool}
        onToolChange={setTool}
        organism={organism}
        onOrganismChange={setOrganism}
        minIdentity={minIdentity}
        onIdentityChange={setMinIdentity}
        minCoverage={minCoverage}
        onCoverageChange={setMinCoverage}
        onRun={handleRunClick}
        canRun={Boolean(upload.file) && status !== 'running'}
        status={status}
        statusStep={statusStep}
      />

      {/* Backend Analysis Error Banner */}
      {error && (
        <Alert variant="error" title="Analysis Pipeline Error">
          {error}
        </Alert>
      )}

      {/* Results Section */}
      <ResultsSection analysisResult={analysisResult} status={status} />
    </>
  );
}
