import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function ExampleFormat() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--primary-blue)'
        }}
        aria-expanded={open}
      >
        <span>View Example CSV Format</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <pre
          style={{
            marginTop: '0.5rem',
            padding: '0.75rem',
            background: '#f8fafc',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-mono)',
            overflowX: 'auto',
            color: 'var(--text-main)',
            lineHeight: 1.4
          }}
        >
{`isolate_id,contig_id,sequence
ISO001,contig_1,ATGCGATCGATCGATCGATCGATCGATCGATC...
ISO001,contig_2,TTGCGATCGATCGATCGATCGATCGATCGATC...
ISO002,contig_1,GGGCGATCGATCGATCGATCGATCGATCGATC...`}
        </pre>
      )}
    </div>
  );
}
