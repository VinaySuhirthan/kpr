import React from 'react';
import { Dna, BarChart3, TrendingUp, Settings, HelpCircle } from 'lucide-react';

// Navigation levels are static UI structure — not sourced from the backend
const NAV_LEVELS = [
  { id: 'level-1', level: 'Level 1 – Detect', subtitle: 'Genomic + AST Analysis' },
  { id: 'level-2', level: 'Level 2 – Monitor', subtitle: 'Hospital Trends' },
  { id: 'level-3', level: 'Level 3 – Forecast', subtitle: 'Resistance Prediction' },
];

const NAV_ICONS = {
  'level-2': <BarChart3 size={18} />,
  'level-3': <TrendingUp size={18} />,
};

export default function Sidebar({ activeLevel, setActiveLevel }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">

        {/* Brand Header */}
        <div className="brand-header">
          <div className="brand-logo-icon">
            <Dna size={22} />
          </div>
          <div className="brand-text">
            <h1>AMR Intelligence</h1>
            <p>Genotype &rarr; Phenotype &rarr; Decisions</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_LEVELS.map((item) => {
            const isActive = activeLevel === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); setActiveLevel(item.id); }}
              >
                <div className="nav-item-content">
                  {NAV_ICONS[item.id] && (
                    <span className="nav-item-icon">{NAV_ICONS[item.id]}</span>
                  )}
                  <div className="nav-item-text">
                    <span className="nav-title">{item.level}</span>
                    <span className="nav-subtitle">{item.subtitle}</span>
                  </div>
                </div>
                {isActive && <div className="active-dot" />}
              </a>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="footer-link">
          <Settings size={16} />
          <span>Settings</span>
        </div>
        <div className="footer-link">
          <HelpCircle size={16} />
          <span>Help &amp; Documentation</span>
        </div>
      </div>
    </aside>
  );
}
