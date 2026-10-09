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
      <div className="control-bar-inner">
        <div className="control-item">
          <label htmlFor="organism-select" className="control-label">ORGANISM</label>
          <div className="select-wrapper">
            <select
              id="organism-select"
              className="custom-select"
              value={selectedOrganism}
              onChange={(e) => setSelectedOrganism(e.target.value)}
              disabled={organismsLoading || organisms.length === 0}
            >
              {organismsLoading && <option value="">Loading organisms…</option>}
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

        <div className="control-item">
          <label htmlFor="isolate-select" className="control-label">ISOLATE ID</label>
          <div className="select-wrapper">
            <select
              id="isolate-select"
              className="custom-select"
              value={selectedIsolate}
              onChange={(e) => setSelectedIsolate(e.target.value)}
              disabled={isolatesLoading || isolates.length === 0}
            >
              {isolatesLoading && <option value="">Loading isolates…</option>}
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

        <div className="control-action">
          <button
            className="btn-analyze"
            onClick={onAnalyze}
            disabled={!selectedIsolate}
          >
            <Search size={15} />
            <span>Analyze Isolate</span>
          </button>
        </div>
      </div>
    </div>
  );
}
