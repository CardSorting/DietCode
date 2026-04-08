import { createContext } from 'react';
import type { LogLine } from '../views/ConsoleView';
import type { SystemMetrics, SovereignSettings, WebViewRequestType } from '../types/WebViewMessageProtocol';

export interface SovereignContextType {
  activeView: 'console' | 'settings' | 'history';
  setActiveView: (view: 'console' | 'settings' | 'history') => void;
  status: string;
  badge: string;
  logs: LogLine[];
  metrics: SystemMetrics;
  isLinkHealthy: boolean;
  isThinking: boolean;
  addLog: (text: string, type: LogLine['type'], title?: string, status?: string) => void;
  postRequest: (type: WebViewRequestType, payload?: unknown) => string;
  handleSend: (text: string) => void;
  settings: SovereignSettings | null;
  coreTheme: 'cyan' | 'amber' | 'crimson';
  setCoreTheme: (theme: 'cyan' | 'amber' | 'crimson') => void;
}

export const SovereignContext = createContext<SovereignContextType | undefined>(undefined);
