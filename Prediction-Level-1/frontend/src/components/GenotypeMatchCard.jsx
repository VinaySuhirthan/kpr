import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function GenotypeMatchCard({ matchStatus }) {
  const { title, status, description } = matchStatus;

  return (
    <div className="card match-card">
      <div className="match-header">
        <span className="match-tag">{title}</span>
        <div className="match-icon-badge">
          <ShieldCheck size={18} />
        </div>
      </div>

      <h2 className="match-title">{status}</h2>

      <p className="match-description">{description}</p>
    </div>
  );
}
