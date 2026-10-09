import React from 'react';
import { Bug, DollarSign, Target, Pill } from 'lucide-react';

export default function OrganismSummaryCard({ isolateData }) {
  if (!isolateData) return null;

  const {
    shortName,
    status,
    isolateId,
    collectionDate,
    biosampleId,
    assembly,
    stats,
  } = isolateData;

  return (
    <div className="card organism-card">
      <div className="organism-header-row">
        <div className="organism-main-info">
          <div className="organism-badge-icon">
            <Bug size={24} />
          </div>
          <div className="organism-titles">
            <div className="organism-name-status">
              <span className="organism-name">{shortName}</span>
              <span className="badge-analyzed">{status}</span>
            </div>
            <span className="isolate-subtext">
              Isolate ID: <strong>{isolateId}</strong>
            </span>
          </div>
        </div>

        <div className="organism-meta-details">
          <div className="meta-item">
            <span className="meta-label">Collection Date</span>
            <span className="meta-value">{collectionDate}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">BioSample ID</span>
            <span className="meta-value">{biosampleId}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Assembly</span>
            <span className="meta-value">{assembly}</span>
          </div>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-icon-container">
            <DollarSign size={18} />
          </div>
          <div className="stat-info">
            <span className="stat-label">AMR Genes Detected</span>
            <span className="stat-value">{stats.amrGenesDetected}</span>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon-container">
            <Target size={18} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Resistance Mutations</span>
            <span className="stat-value">{stats.resistanceMutations}</span>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon-container">
            <Pill size={18} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Antibiotics Tested</span>
            <span className="stat-value">{stats.antibioticsTested}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
