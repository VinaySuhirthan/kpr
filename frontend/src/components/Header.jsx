import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Dna, Activity, Search, LineChart, Database, ShieldCheck, AlertTriangle } from 'lucide-react';
import './Header.css';

export default function Header() {
  const [pythonHealth, setPythonHealth] = useState('loading');
  const [nodeHealth, setNodeHealth] = useState('loading');

  useEffect(() => {
    // Check Python FastAPI status
    fetch('/api/health')
      .then((res) => (res.ok ? setPythonHealth('online') : setPythonHealth('offline')))
      .catch(() => setPythonHealth('offline'));

    // Check Node Express PostgreSQL status
    fetch('/api/level2/health')
      .then((res) => (res.ok ? setNodeHealth('online') : setNodeHealth('offline')))
      .catch(() => setNodeHealth('offline'));
  }, []);

  return (
    <header className="platform-header">
      <div className="header-brand">
        <div className="brand-logo">
          <Dna className="logo-icon" />
        </div>
        <div className="brand-text">
          <h1>AMR Unified Platform</h1>
          <span className="brand-subtitle">Antimicrobial Resistance Intelligence &amp; Surveillance</span>
        </div>
      </div>

      <nav className="header-nav">
        <NavLink to="/prediction" className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>
          <Dna className="tab-icon" />
          <div className="tab-label">
            <span className="tab-level">Level 1</span>
            <span className="tab-title">Prediction</span>
          </div>
        </NavLink>

        <NavLink to="/surveillance" className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>
          <Activity className="tab-icon" />
          <div className="tab-label">
            <span className="tab-level">Level 2</span>
            <span className="tab-title">Surveillance</span>
          </div>
        </NavLink>

        <NavLink to="/gene-detection" className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>
          <Search className="tab-icon" />
          <div className="tab-label">
            <span className="tab-level">Level 3</span>
            <span className="tab-title">Gene Detection</span>
          </div>
        </NavLink>

        <NavLink to="/forecasting" className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>
          <LineChart className="tab-icon" />
          <div className="tab-label">
            <span className="tab-level">Level 4</span>
            <span className="tab-title">Forecasting</span>
          </div>
        </NavLink>
      </nav>

      <div className="header-status">
        <div className="status-pill" title="Python FastAPI backend (Levels 1, 3, 4)">
          <span className={`status-dot ${pythonHealth}`} />
          <span className="status-name">Python API :8000</span>
        </div>
        <div className="status-pill" title="Node Express PostgreSQL backend (Level 2)">
          <span className={`status-dot ${nodeHealth}`} />
          <span className="status-name">PostgreSQL :5000</span>
        </div>
      </div>
    </header>
  );
}
