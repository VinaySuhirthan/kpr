import { PageLayout } from './components/layout/PageLayout';
import { Level1Page } from './pages/Level1';
import { useAmrAnalysis } from './hooks/useAmrAnalysis';
import { useFileUpload } from './hooks/useFileUpload';
import './styles/global.css';
import './styles/dashboard.css';

export default function App() {
  const analysis = useAmrAnalysis();
  const upload = useFileUpload();

  return (
    <PageLayout
      toolStatus={analysis.toolStatus}
      onRefreshStatus={analysis.fetchToolStatus}
    >
      <Level1Page analysis={analysis} upload={upload} />
    </PageLayout>
  );
}
