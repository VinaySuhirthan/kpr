import { Dna, Activity, BrainCircuit, Info, ShieldCheck } from 'lucide-react';

export function Sidebar({ activeTab = 'level1' }) {
  return (
    <aside className="sidebar" aria-label="Sidebar Navigation">
      <div className="sidebar-header">
        <Dna className="sidebar-logo-icon" />
        <div>
          <div className="sidebar-title">AMR Genomics</div>
          <div className="sidebar-subtitle">NCBI Analysis Suite</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div style={{ fontSize: '0.72rem', color: 'var(--sidebar-muted)', padding: '0 0.75rem 0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Modules
        </div>

        <button
          className={`nav-item ${activeTab === 'level1' ? 'active' : ''}`}
          aria-current={activeTab === 'level1' ? 'page' : undefined}
        >
          <ShieldCheck size={18} />
          <span>Level 1: AMR Gene Detection</span>
        </button>

        <button className="nav-item disabled" disabled title="Level 2 coming in next phase">
          <Activity size={18} />
          <span>Level 2: Genotype ↔ Phenotype</span>
          <span className="nav-badge-soon">Soon</span>
        </button>

        <button className="nav-item disabled" disabled title="Level 3 coming in next phase">
          <BrainCircuit size={18} />
          <span>Level 3: ML Prediction</span>
          <span className="nav-badge-soon">Soon</span>
        </button>

        <div style={{ margin: '1rem 0 0.5rem', borderTop: '1px solid var(--sidebar-border)' }} />

        <button className="nav-item">
          <Info size={18} />
          <span>About System</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div>AMRFinderPlus v3.12+</div>
        <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>NCBI Reference DB</div>
      </div>
    </aside>
  );
}
