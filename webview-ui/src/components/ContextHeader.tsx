import type { SystemMetrics } from '../types/WebViewMessageProtocol';

interface ContextHeaderProps {
  metrics: SystemMetrics;
}

export function ContextHeader({ metrics }: ContextHeaderProps) {
  // Simplified status messages
  const getStatusMessage = () => {
    if (metrics.status === 'OPTIMAL') return 'Ready';
    if (metrics.status === 'OPTIMIZING') return 'Optimizing...';
    return 'Standby';
  };

  return (
    <div className="app-header">
      <div className="app-header-top">
        <div className="header-content">
          <h1 className="app-title">DietCode</h1>
          <p className="app-subtitle">AI coding assistant</p>
        </div>
        <div className="header-status">
          <div className="status-indicator" />
          <span className="status-text">{getStatusMessage()}</span>
        </div>
      </div>
    </div>
  );
}


