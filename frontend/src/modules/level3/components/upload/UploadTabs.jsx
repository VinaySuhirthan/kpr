import { useState } from 'react';
import { Card } from '../common/Card';
import { CsvUploader } from './CsvUploader';
import { FastaUploader } from './FastaUploader';
import { InputFormatCard } from './InputFormatCard';

export function UploadTabs({ uploadState }) {
  const [activeTab, setActiveTab] = useState('csv');

  return (
    <div className="upload-grid">
      <Card>
        <div className="tab-nav" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'csv'}
            className={`tab-btn ${activeTab === 'csv' ? 'active' : ''}`}
            onClick={() => setActiveTab('csv')}
          >
            Upload CSV
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'fasta'}
            className={`tab-btn ${activeTab === 'fasta' ? 'active' : ''}`}
            onClick={() => setActiveTab('fasta')}
          >
            Upload FASTA
          </button>
        </div>

        {activeTab === 'csv' ? (
          <CsvUploader
            file={uploadState.file}
            error={uploadState.error}
            isDragging={uploadState.isDragging}
            onSelectFile={uploadState.handleSelectFile}
            onDrop={uploadState.handleDrop}
            onDragOver={uploadState.handleDragOver}
            onDragLeave={uploadState.handleDragLeave}
            onClearFile={uploadState.clearFile}
          />
        ) : (
          <FastaUploader
            file={uploadState.file}
            error={uploadState.error}
            isDragging={uploadState.isDragging}
            onSelectFile={uploadState.handleSelectFile}
            onDrop={uploadState.handleDrop}
            onDragOver={uploadState.handleDragOver}
            onDragLeave={uploadState.handleDragLeave}
            onClearFile={uploadState.clearFile}
          />
        )}
      </Card>

      <InputFormatCard />
    </div>
  );
}
