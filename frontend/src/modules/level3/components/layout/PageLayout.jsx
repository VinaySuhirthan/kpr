import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function PageLayout({ children, toolStatus, onRefreshStatus }) {
  return (
    <div className="app-container">
      <Sidebar activeTab="level1" />
      <div className="main-wrapper">
        <Header toolStatus={toolStatus} onRefreshStatus={onRefreshStatus} />
        <main className="page-container" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}
