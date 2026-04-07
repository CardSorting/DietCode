import { useState, useEffect, useRef, useCallback } from 'react';
import { TerminalSquare, Settings as SettingsIcon, History } from 'lucide-react';
import { useSovereignBridge } from './hooks/useSovereignBridge';
import { WebViewMessageType, WebViewRequestType } from './types/WebViewMessageProtocol';
import type { LogLine } from './views/ConsoleView';
import type { SystemMetrics } from './types/WebViewMessageProtocol';

import { ConsoleView } from './views/ConsoleView';
import { SettingsView } from './views/SettingsView';
import { CheckpointHistoryView } from './views/CheckpointHistoryView';

function App() {
  const [activeView, setActiveView] = useState<'console' | 'settings' | 'history'>('console');
  const [status, setStatus] = useState('Connecting...');
  const [badge, setBadge] = useState('READY');
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [isLinkHealthy, setIsLinkHealthy] = useState(true);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    neuralLoad: 0,
    neuralTotal: 128000,
    cacheMapping: 0,
    status: 'OPTIMAL'
  });

  const bottomRef = useRef<HTMLDivElement>(null);

  const { postRequest, useMessageListener, generateId } = useSovereignBridge();

  const addLog = useCallback((text: string, type: LogLine['type'], title?: string, status?: string) => {
    setLogs(prev => [...prev, { id: generateId(), text, type, title, status }]);
  }, [generateId]);

  const appendStream = useCallback((text: string) => {
    setLogs(prev => {
      const last = prev[prev.length - 1];
      if (last && last.type === 'stream') {
        const updatedLogs = [...prev];
        updatedLogs[updatedLogs.length - 1] = { ...last, text: last.text + text };
        return updatedLogs;
      }
      return [...prev, { id: generateId(), text, type: 'stream' }];
    });
  }, [generateId]);

  // IPC Event Subscriptions
  useMessageListener(WebViewMessageType.READY, () => {
    setBadge('CONNECTED');
    setStatus('Connection Stable');
  });

  useMessageListener(WebViewMessageType.SYSTEM_READY, () => {
    setBadge('READY');
    setStatus('DietCode Ready');
    addLog('>> [SYSTEM]: System connected successfully.', 'system');
  });

  useMessageListener(WebViewMessageType.SYSTEM_METRICS, (payload: SystemMetrics) => {
    setMetrics(payload);
  });

  useMessageListener(WebViewMessageType.SETTINGS_LOADED, (payload) => {
    addLog(`> SYSTEM: Settings updated. Auto-Approve: ${payload.autoApprove}`, 'system', 'Settings Updated');
  });

  useMessageListener(WebViewMessageType.STATE, (payload) => {
    addLog(`${payload.key} -> ${payload.value}`, 'info');
  });

  useMessageListener(WebViewMessageType.HOOK, (payload) => {
    addLog(`Hook [${payload.hookName}] Phase: ${payload.phase}`, 'hook', 'Hook Execution');
  });

  useMessageListener(WebViewMessageType.TOOL, (payload) => {
    addLog(payload.result ? JSON.stringify(payload.result, null, 2) : 'Waiting for approval', 'tool', `Tool: ${payload.toolName}`, payload.status);
  });

  useMessageListener(WebViewMessageType.LOG, (payload) => {
    addLog(`> ${payload.level.toUpperCase()}: ${payload.message}`, payload.level === 'error' ? 'error' : 'info');
  });

  useMessageListener(WebViewMessageType.ERROR, (payload) => {
    addLog(`> ERROR: ${payload.message}`, 'error');
  });

  useMessageListener(WebViewMessageType.STREAM, (payload) => {
    appendStream(payload.text);
  });

  useMessageListener(WebViewMessageType.HEARTBEAT_PONG, () => {
    setIsLinkHealthy(true);
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      setIsLinkHealthy(false); // Reset health, wait for pong
      postRequest(WebViewRequestType.ECHO, { timestamp: Date.now() });
    }, 15000); 

    return () => clearInterval(intervalId);
  }, [postRequest]);

  const handleSend = (text: string) => {
    addLog(text, 'info'); 
    postRequest(WebViewRequestType.SEND_MESSAGE, { text });
  };

  return (
    <div className="content">
      <header>
        <div className="logo-container">
        </div>
        <div className="subtitle">[ AI DEVELOPMENT SYSTEM ]</div>
        <div className="header-nav">
          <button 
            type="button" 
            className={`icon-btn ${activeView === 'console' ? 'active' : ''}`} 
            onClick={() => setActiveView('console')}
            title="Terminal Console"
          >
            <TerminalSquare size={18} />
          </button>
          <button 
            type="button" 
            className={`icon-btn ${activeView === 'history' ? 'active' : ''}`} 
            onClick={() => setActiveView('history')}
            title="History"
          >
            <History size={18} />
          </button>
          <button 
            type="button" 
            className={`icon-btn ${activeView === 'settings' ? 'active' : ''}`} 
            onClick={() => setActiveView('settings')}
            title="Configuration"
          >
            <SettingsIcon size={18} />
          </button>
        </div>
      </header>
      
      <main style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <ConsoleView 
          logs={logs} 
          status={status} 
          badge={badge} 
          metrics={metrics}
          bottomRef={bottomRef} 
          onSend={handleSend} 
          isHidden={activeView !== 'console'} 
        />
        {activeView === 'settings' && <SettingsView onClose={() => setActiveView('console')} />}
        {activeView === 'history' && <CheckpointHistoryView onClose={() => setActiveView('console')} />}
      </main>
      
      {activeView === 'console' && (
        <footer>
          <div className="cinematic-border" />
          <div className="metrics">
            <span className={`metric health-indicator ${isLinkHealthy ? 'healthy' : 'unhealthy'}`}>
              LINK: {isLinkHealthy ? 'ACTIVE' : 'DEGRADED'}
            </span>
            <span className="metric">v2.2.0</span>
            <span className="metric">REACT_V18</span>
            <span className="metric">{logs.length} LOGS</span>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;
