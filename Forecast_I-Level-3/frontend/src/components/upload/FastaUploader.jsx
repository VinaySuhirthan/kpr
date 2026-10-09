import { useRef } from 'react';
import { Upload, FileCheck, X } from 'lucide-react';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';

export function FastaUploader({
  file,
  error,
  isDragging,
  onSelectFile,
  onDrop,
  onDragOver,
  onDragLeave,
  onClearFile
}) {
  const inputRef = useRef(null);

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onSelectFile(e.target.files[0]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        className={`dropzone ${isDragging ? 'dragging' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload FASTA Dropzone"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".fasta,.fa,.fna"
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />

        <Upload className="dropzone-icon" />
        <div>
          <div className="dropzone-title">Drag and drop your FASTA file here</div>
          <div className="dropzone-sub">or click to browse (.fasta, .fa, .fna)</div>
        </div>

        {file && (
          <div className="file-selected-badge" onClick={(e) => e.stopPropagation()}>
            <FileCheck size={16} />
            <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
            <button
              onClick={onClearFile}
              title="Remove file"
              style={{ marginLeft: '6px', color: '#1e40af' }}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="error" title="Validation Error">
          {error}
        </Alert>
      )}

      <div className="btn-row">
        <Button
          variant="outline"
          onClick={() => inputRef.current?.click()}
          icon={<Upload size={16} />}
        >
          {file ? 'Change FASTA File' : 'Choose FASTA File'}
        </Button>
      </div>
    </div>
  );
}
