import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useSovereignBridge, useSovereignMessage } from '../hooks/useSovereignBridge';
import { WebViewMessageType, WebViewRequestType } from '../types/WebViewMessageProtocol';
import type { LogLine } from '../views/ConsoleView';
import type { SystemMetrics, SovereignSettings } from '../types/WebViewMessageProtocol';
import { SovereignContext } from './SovereignContextDefinition';
import type { SovereignContextType } from './SovereignContextDefinition';

export const SovereignProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<'console' | 'settings' | 'history'>('console');
  const [status, setStatus] = useState('Connecting...');
  const [badge, setBadge] = useState('READY');
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [isLinkHealthy, setIsLinkHealthy] = useState(true);
  const [settings, setSettings] = useState<SovereignSettings | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [coreTheme, setCoreTheme] = useState<'cyan' | 'amber' | 'crimson'>('cyan');
  
  const [metrics, setMetrics] = useState<SystemMetrics>({
    neuralLoad: 0,
    neuralTotal: 128000,
    cacheMapping: 0,
    status: 'OPTIMAL'
  });


  const { postRequest, generateId } = useSovereignBridge();

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
  useSovereignMessage(WebViewMessageType.READY, () => {
    setBadge('CONNECTED');
    setStatus('Connection Stable');
  });

  useSovereignMessage(WebViewMessageType.SYSTEM_READY, () => {
    setBadge('READY');
    setStatus('DietCode Ready');
    addLog('>> [SYSTEM]: System connected successfully.', 'system');
  });

  useSovereignMessage<SystemMetrics>(WebViewMessageType.SYSTEM_METRICS, (payload) => {
    setMetrics(payload);
  });

  useSovereignMessage<SovereignSettings>(WebViewMessageType.SETTINGS_LOADED, (payload) => {
    setSettings(payload);
    addLog(`> SYSTEM: Settings updated. Auto-Approve: ${payload.autoApprove}`, 'system', 'Settings Updated');
  });

  useSovereignMessage<{ key: string; value: string }>(WebViewMessageType.STATE, (payload) => {
    addLog(`${payload.key} -> ${payload.value}`, 'info');
  });

  useSovereignMessage<{ hookName: string; phase: string }>(WebViewMessageType.HOOK, (payload) => {
    addLog(`Hook [${payload.hookName}] Phase: ${payload.phase}`, 'hook', 'Hook Execution');
  });

  useSovereignMessage<{ toolName: string; status: string; result?: unknown }>(WebViewMessageType.TOOL, (payload) => {
    setIsThinking(false);
    addLog(payload.result ? JSON.stringify(payload.result, null, 2) : 'Awaiting approval...', 'tool', `Tool: ${payload.toolName}`, payload.status);
  });

  useSovereignMessage<{ level: string; message: string }>(WebViewMessageType.LOG, (payload) => {
    addLog(`> ${payload.level.toUpperCase()}: ${payload.message}`, payload.level === 'error' ? 'error' : 'info');
  });

  useSovereignMessage<{ message: string }>(WebViewMessageType.ERROR, (payload) => {
    addLog(`> ERROR: ${payload.message}`, 'error');
  });

  useSovereignMessage<{ text: string }>(WebViewMessageType.STREAM, (payload) => {
    setIsThinking(false);
    appendStream(payload.text);
  });

  useSovereignMessage(WebViewMessageType.HEARTBEAT_PONG, () => {
    setIsLinkHealthy(true);
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      setIsLinkHealthy(false);
      postRequest(WebViewRequestType.ECHO, { timestamp: Date.now() });
    }, 15000); 

    // Background Chronology Sync (every 60 seconds)
    const chronologyId = setInterval(() => {
      postRequest(WebViewRequestType.LOAD_CHECKPOINTS);
    }, 60000);

    return () => {
      clearInterval(intervalId);
      clearInterval(chronologyId);
    };
  }, [postRequest]);


  const handleSend = (text: string) => {
    addLog(text, 'info'); 
    setIsThinking(text.trim().length > 0);
    postRequest(WebViewRequestType.SEND_MESSAGE, { text });
  };

  return (
    <SovereignContext.Provider value={{
      activeView,
      setActiveView,
      status,
      badge,
      logs,
      metrics,
      isLinkHealthy,
      addLog,
      postRequest,
      isThinking,
      handleSend,
      settings,
      coreTheme,
      setCoreTheme
    }}>

      {children}
    </SovereignContext.Provider>
  );
};

export type { SovereignContextType };
