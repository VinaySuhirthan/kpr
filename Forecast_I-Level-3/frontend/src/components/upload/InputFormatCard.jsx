import { Card } from '../common/Card';
import { ExampleFormat } from './ExampleFormat';
import { FileSpreadsheet } from 'lucide-react';

export function InputFormatCard() {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
        <FileSpreadsheet size={20} color="var(--primary-blue)" />
        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Expected CSV Format</h3>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Your genomic CSV file must contain the following required header columns:
      </p>

      <table className="info-table" aria-label="Required CSV Columns">
        <thead>
          <tr>
            <th>Column Name</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span className="code-tag">isolate_id</span></td>
            <td>Sample or isolate identifier</td>
          </tr>
          <tr>
            <td><span className="code-tag">contig_id</span></td>
            <td>Contig or sequence identifier</td>
          </tr>
          <tr>
            <td><span className="code-tag">sequence</span></td>
            <td>DNA nucleotide sequence (A, T, G, C)</td>
          </tr>
        </tbody>
      </table>

      <ExampleFormat />
    </Card>
  );
}
