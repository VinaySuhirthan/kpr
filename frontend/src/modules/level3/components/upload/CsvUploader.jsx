import { useRef } from 'react';
import { Upload, FileCheck, Download, X } from 'lucide-react';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';

export function CsvUploader({
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
        aria-label="Upload CSV Dropzone"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />

        <Upload className="dropzone-icon" />
        <div>
          <div className="dropzone-title">Drag and drop your CSV file here</div>
          <div className="dropzone-sub">or click to browse from your computer</div>
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
        <Alert variant="error" title="Input Validation Notice">
          {error}
        </Alert>
      )}

      <div className="btn-row">
        <Button
          variant="outline"
          onClick={() => inputRef.current?.click()}
          icon={<Upload size={16} />}
        >
          {file ? 'Change CSV File' : 'Choose CSV File'}
        </Button>

        <a
          href="/sample-data/sample_genome.csv"
          download="sample_genome.csv"
          style={{ textDecoration: 'none' }}
        >
          <Button variant="outline" icon={<Download size={16} />}>
            Download Sample CSV
          </Button>
        </a>
      </div>
    </div>
  );
}
