import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { formatPercent, formatCoordinate, getStrandLabel } from '../../utils/formatResults';
import { AlertCircle } from 'lucide-react';

export function AmrGenesTable({ results }) {
  if (!results || results.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
        <EmptyState
          icon={<AlertCircle className="empty-box-icon" style={{ color: '#0284c7' }} />}
          title="No AMR Genes Detected"
          message="No AMR determinants matching the current AMRFinderPlus database/settings were detected in the uploaded genomic sequences."
        />
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          * Biological Note: Absence of known curated AMR determinants in the database under current thresholds does not guarantee phenotypic susceptibility.
        </div>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="data-table" aria-label="Detected AMR Genes Table">
        <thead>
          <tr>
            <th>#</th>
            <th>Isolate ID</th>
            <th>Contig ID</th>
            <th>Gene</th>
            <th>Gene Class</th>
            <th>Method</th>
            <th>Start</th>
            <th>End</th>
            <th>Strand</th>
            <th>Identity (%)</th>
            <th>Coverage (%)</th>
            <th>Resistance Mechanism</th>
          </tr>
        </thead>
        <tbody>
          {results.map((row, idx) => (
            <tr key={`${row.isolate_id}-${row.contig_id}-${row.gene}-${idx}`}>
              <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
              <td style={{ fontWeight: 600 }}>{row.isolate_id}</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{row.contig_id}</td>
              <td>
                <Badge variant="gene">{row.gene}</Badge>
              </td>
              <td>
                {row.gene_class ? (
                  <Badge variant="class">{row.gene_class}</Badge>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>-</span>
                )}
              </td>
              <td>{row.method || 'AMRFinderPlus'}</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCoordinate(row.start)}</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCoordinate(row.end)}</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>{getStrandLabel(row.strand)}</td>
              <td style={{ fontWeight: 600 }}>{formatPercent(row.identity)}</td>
              <td style={{ fontWeight: 600 }}>{formatPercent(row.coverage)}</td>
              <td style={{ maxWidth: '240px', whiteSpace: 'normal' }}>
                {row.mechanism || <span style={{ color: 'var(--text-muted)' }}>Unspecified</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
