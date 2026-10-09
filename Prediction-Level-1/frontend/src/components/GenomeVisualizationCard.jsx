import React from 'react';
import { Monitor, ArrowRight } from 'lucide-react';

export default function GenomeVisualizationCard({ findings, isolateData, onViewFullGenome }) {
  const genomeSizeMb = isolateData.genomeSizeMb || 4.6;

  // Calculate percentage positions for markers on track
  const getMarkerPosition = (mb) => {
    return Math.min(Math.max((mb / genomeSizeMb) * 100, 4), 96);
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <span className="card-title-icon">
            <Monitor size={16} />
          </span>
          <span className="card-title">Genome Visualization</span>
        </div>
        <button
          className="card-subtitle-link"
          style={{ background: 'none', border: 'none', padding: 0 }}
          onClick={onViewFullGenome}
        >
          <span>View Full Genome</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div className="genome-track-container">
        {/* Track Title Bar */}
        <div className="genome-header-info">
          <div>
            <span className="chromosome-title">{isolateData.shortName} Chromosome</span>{' '}
            <span className="chromosome-size">({genomeSizeMb} Mb)</span>
          </div>
          <span className="genome-mode-tag">CIRCULAR GENOME MAPPED LINEAR</span>
        </div>

        {/* Genome Visual Track Area */}
        <div className="genome-visual-wrapper">
          {/* Scale Ticks */}
          <div className="scale-axis">
            <div className="scale-tick">
              <span>0 Mb</span>
              <div className="tick-line" />
            </div>
            <div className="scale-tick">
              <span>1 Mb</span>
              <div className="tick-line" />
            </div>
            <div className="scale-tick">
              <span>2 Mb</span>
              <div className="tick-line" />
            </div>
            <div className="scale-tick">
              <span>3 Mb</span>
              <div className="tick-line" />
            </div>
            <div className="scale-tick">
              <span>4 Mb</span>
              <div className="tick-line" />
            </div>
            <div className="scale-tick">
              <span>{genomeSizeMb} Mb</span>
              <div className="tick-line" />
            </div>
          </div>

          {/* Base Linear Track Bar */}
          <div className="linear-track-bar">
            {/* Background block shapes */}
            <div className="track-block" style={{ width: '15%', marginLeft: '5%' }} />
            <div className="track-block" style={{ width: '12%', marginLeft: '15%' }} />
            <div className="track-block" style={{ width: '18%', marginLeft: '12%' }} />
            <div className="track-block" style={{ width: '10%', marginLeft: '8%' }} />

            {/* Gene / Mutation Marker Pins */}
            {findings.map((item) => {
              const posPercent = getMarkerPosition(item.startMb);
              const isAmr = item.type === 'AMR Gene';

              return (
                <div
                  key={item.id}
                  className="track-marker-pin"
                  style={{ left: `${posPercent}%` }}
                >
                  <div className={`pin-bar ${isAmr ? 'amr-gene' : 'mutation'}`} />
                  <div className="pin-stem" />
                  <div className={`pin-tooltip-card ${isAmr ? 'amr-gene' : 'mutation'}`}>
                    <span className="tooltip-gene-name">{item.gene}</span>
                    <span className="tooltip-gene-pos">
                      {item.startMb} {item.startMb !== item.endMb ? `- ${item.endMb}` : ''} Mb
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="genome-legend">
          <div className="legend-item">
            <span className="legend-dot amr-gene" />
            <span>AMR gene</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot mutation" />
            <span>Mutation</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot other" />
            <span>Other genes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
