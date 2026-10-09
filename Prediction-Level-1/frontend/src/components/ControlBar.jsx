import React from 'react';
import { Search, ChevronDown } from 'lucide-react';

export default function ControlBar({
  selectedOrganism,
  setSelectedOrganism,
  selectedIsolate,
  setSelectedIsolate,
  onAnalyze,
  organisms,
  isolates,
  organismsLoading,
  isolatesLoading,
}) {
  return (
    <div className="card control-bar-card">
      <div className="control-group">

        {/* Organism Select */}
        <div className="control-item">
          <label htmlFor="organism-select" className="control-label">Organism:</label>
          <div className="select-pill-wrapper">
            <select
              id="organism-select"
              className="select-pill"
              value={selectedOrganism}
              onChange={(e) => setSelectedOrganism(e.target.value)}
              disabled={organismsLoading || organisms.length === 0}
            >
              {organismsLoading && <option value="">Loading…</option>}
              {!organismsLoading && organisms.length === 0 && (
                <option value="">No organisms available</option>
              )}
              {organisms.map((org) => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
            <ChevronDown size={14} className="select-chevron" />
          </div>
        </div>

        {/* Isolate ID Select */}
        <div className="control-item">
          <label htmlFor="isolate-select" className="control-label">Isolate ID:</label>
          <div className="select-pill-wrapper">
            <select
              id="isolate-select"
              className="select-pill"
              value={selectedIsolate}
              onChange={(e) => setSelectedIsolate(e.target.value)}
              disabled={isolatesLoading || isolates.length === 0}
            >
              {isolatesLoading && <option value="">Loading…</option>}
              {!isolatesLoading && isolates.length === 0 && (
                <option value="">No isolates available</option>
              )}
              {isolates.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
            <ChevronDown size={14} className="select-chevron" />
          </div>
        </div>

      </div>

      <button
        className="btn-analyze"
        onClick={onAnalyze}
        disabled={!selectedIsolate}
      >
        <Search size={15} />
        <span>Analyze</span>
      </button>
    </div>
  );
}
