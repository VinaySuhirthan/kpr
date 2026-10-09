import { Card } from '../common/Card';
import { ToolSelector } from './ToolSelector';
import { OrganismSelector } from './OrganismSelector';
import { ThresholdInputs } from './ThresholdInputs';
import { RunAnalysisButton } from './RunAnalysisButton';
import { Spinner } from '../common/Spinner';

export function AnalysisOptions({
  tool,
  onToolChange,
  organism,
  onOrganismChange,
  minIdentity,
  onIdentityChange,
  minCoverage,
  onCoverageChange,
  onRun,
  canRun,
  status,
  statusStep
}) {
  const isRunning = status === 'running';

  return (
    <Card>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Analysis Parameters</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Configure annotation criteria for NCBI AMRFinderPlus reference matching.
        </p>
      </div>

      <div className="options-bar">
        <ToolSelector value={tool} onChange={onToolChange} disabled={isRunning} />
        <OrganismSelector value={organism} onChange={onOrganismChange} disabled={isRunning} />
        <ThresholdInputs
          minIdentity={minIdentity}
          onIdentityChange={onIdentityChange}
          minCoverage={minCoverage}
          onCoverageChange={onCoverageChange}
          disabled={isRunning}
        />
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <RunAnalysisButton onClick={onRun} disabled={!canRun} isRunning={isRunning} />
        </div>
      </div>

      {isRunning && (
        <div className="loading-box" style={{ marginTop: '1.25rem' }}>
          <Spinner />
          <div>
            <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.95rem' }}>
              AMR Analysis Pipeline in Progress
            </div>
            <div style={{ fontSize: '0.85rem', color: '#15803d' }}>
              {statusStep || 'Processing genomic sequences with AMRFinderPlus...'}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
