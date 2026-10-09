import { useState } from 'react';
import { formatCoordinate, formatPercent } from '../../utils/formatResults';
import { EmptyState } from '../common/EmptyState';
import { Dna, Info } from 'lucide-react';

export function GenomeVisualization({ tracks, results }) {
  const [activeTooltip, setActiveTooltip] = useState(null);

  if (!tracks || tracks.length === 0) {
    if (results && results.length > 0) {
      return (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Info size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.7 }} />
          <div>Genomic coordinates unavailable for these results in the reference database.</div>
        </div>
      );
    }
    return (
      <EmptyState
        title="No Genomic Tracks to Display"
        message="Tracks will appear here when AMR genes with coordinate annotations are detected."
      />
    );
  }

  return (
    <div className="visualization-container">
      <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
        Displaying AMR gene positions along contigs based on actual genomic coordinates annotated by AMRFinderPlus.
      </div>

      {tracks.map((track) => {
        const hasValidLength = track.contig_length && track.contig_length > 0;
        const contigLength = hasValidLength ? track.contig_length : 10000;

        return (
          <div key={`${track.isolate_id}-${track.contig_id}`} className="contig-track-card">
            <div className="contig-track-header">
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Isolate:</span>{' '}
                <strong>{track.isolate_id}</strong> &nbsp;|&nbsp;{' '}
                <span style={{ color: 'var(--text-secondary)' }}>Contig:</span>{' '}
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-blue)' }}>{track.contig_id}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {hasValidLength ? `Length: ${formatCoordinate(track.contig_length)} bp` : 'Length: relative scale'}
              </div>
            </div>

            <div className="contig-track-line">
              {track.genes.map((gene, gIdx) => {
                const hasCoords = gene.start !== null && gene.end !== null;
                if (!hasCoords) {
                  return (
                    <div
                      key={gIdx}
                      style={{
                        position: 'absolute',
                        top: '-15px',
                        left: `${(gIdx * 25) + 10}%`,
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)'
                      }}
                    >
                      [{gene.gene}: Genomic coordinates unavailable]
                    </div>
                  );
                }

                const leftPercent = Math.max(0, Math.min(95, ((gene.start - 1) / contigLength) * 100));
                const widthPercent = Math.max(4, Math.min(100 - leftPercent, ((gene.end - gene.start + 1) / contigLength) * 100));

                const isForward = gene.strand === '+';
                const bg = isForward ? '#2563eb' : '#7c3aed';

                return (
                  <div
                    key={gIdx}
                    className="gene-glyph"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${Math.max(widthPercent, 8)}%`,
                      backgroundColor: bg
                    }}
                    onMouseEnter={() => setActiveTooltip(`${track.contig_id}-${gIdx}`)}
                    onMouseLeave={() => setActiveTooltip(null)}
                    title={`${gene.gene} (${formatCoordinate(gene.start)} - ${formatCoordinate(gene.end)}, Strand: ${gene.strand || '?'})`}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                      {gene.gene}
                    </div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.9 }}>
                      {gene.strand === '+' ? '→' : gene.strand === '-' ? '←' : ''} {formatCoordinate(gene.start)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="coordinate-markers">
              <span>1 bp</span>
              <span>{hasValidLength ? `${formatCoordinate(track.contig_length)} bp` : 'End'}</span>
            </div>

            {/* Gene Coordinate Legend */}
            <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.8rem' }}>
              {track.genes.map((g, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#f8fafc',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '2px',
                      backgroundColor: g.strand === '+' ? '#2563eb' : '#7c3aed'
                    }}
                  />
                  <strong>{g.gene}</strong>: {g.start !== null && g.end !== null ? `${formatCoordinate(g.start)} - ${formatCoordinate(g.end)} bp (${g.strand || '?'})` : 'Genomic coordinates unavailable for this result'}
                  {g.identity !== null && <span style={{ color: 'var(--text-muted)' }}>| {formatPercent(g.identity)} id</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
