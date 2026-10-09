import React from 'react';
import { ShieldCheck, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export default function GenotypeMatchCard({ matchStatus }) {
  if (!matchStatus) return null;
  const { title, status, description, concordanceLevel, overallStatus } = matchStatus;

  const isConsistent = overallStatus === 'CONSISTENT' || status === 'Consistent';
  const isMismatch = overallStatus === 'POSSIBLE_MISMATCH' || status === 'Possible Mismatch';

  const statusClass = isConsistent ? 'consistent' : isMismatch ? 'mismatch' : 'warning';

  return (
    <div className={`card match-card ${statusClass}`}>
      <div className="match-header">
        <span className="match-tag">{title || 'GENOTYPE ↔ PHENOTYPE MATCH'}</span>
        <div className={`match-icon-badge ${statusClass}`}>
          {isConsistent ? (
            <CheckCircle2 size={18} />
          ) : isMismatch ? (
            <AlertCircle size={18} />
          ) : (
            <Info size={18} />
          )}
        </div>
      </div>

      <div className="match-body">
        <h2 className={`match-title ${statusClass}`}>{status}</h2>
        <p className="match-description">{description}</p>
      </div>

      {concordanceLevel && (
        <div className="match-footer">
          <span className="concordance-pill">
            <span className="concordance-dot" />
            {concordanceLevel}
          </span>
        </div>
      )}
    </div>
  );
}
