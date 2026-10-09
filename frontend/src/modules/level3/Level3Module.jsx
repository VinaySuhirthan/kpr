import React from 'react';
import { PageLayout } from './components/layout/PageLayout';
import { Level1Page } from './pages/Level1';
import { useAmrAnalysis } from './hooks/useAmrAnalysis';
import { useFileUpload } from './hooks/useFileUpload';
import './styles/global.css';
import './styles/dashboard.css';

export default function Level3Module() {
  const analysis = useAmrAnalysis();
  const upload = useFileUpload();

  return (
    <div className="level3-container">
      <PageLayout
        toolStatus={analysis.toolStatus}
        onRefreshStatus={analysis.fetchToolStatus}
      >
        <Level1Page analysis={analysis} upload={upload} />
      </PageLayout>
    </div>
  );
}
