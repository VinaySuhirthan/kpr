import { Badge } from '../common/Badge';
import { RefreshCw, Terminal } from 'lucide-react';

export function Header({ toolStatus, onRefreshStatus }) {
  const isAvailable = toolStatus?.available;

  return (
    <header className="top-header" role="banner">
      <div className="header-left">
        <h1 className="header-title">AMR Dashboard</h1>
        <Badge variant="mode">Research Mode</Badge>
      </div>

      <div className="header-right">
        <div
          className="tool-status-pill"
          title={toolStatus?.message || (isAvailable ? `AMRFinderPlus: ${toolStatus?.version || 'Active'}` : 'AMRFinderPlus not detected')}
        >
          <span className={`status-dot ${isAvailable ? 'online' : 'offline'}`} />
          <span>
            {isAvailable === null
              ? 'Checking Tool...'
              : isAvailable
              ? `AMRFinderPlus (${toolStatus?.version ? toolStatus.version.split(' ')[0] : 'Ready'})`
              : 'AMRFinderPlus Offline'}
          </span>
          {onRefreshStatus && (
            <button
              onClick={onRefreshStatus}
              title="Refresh Tool Status"
              style={{ display: 'flex', alignItems: 'center', opacity: 0.6 }}
            >
              <RefreshCw size={12} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
