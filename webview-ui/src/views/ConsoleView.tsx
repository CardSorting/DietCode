/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { RefObject } from 'react';
import { SovereignInput } from '../components/SovereignInput';
import { ActionRow } from '../components/ActionRow';
import { MarkdownOutput } from '../components/MarkdownOutput';
import { SovereignTyping } from '../components/SovereignTyping';
import { ContextHeader } from '../components/ContextHeader';
import type { SystemMetrics } from '../types/WebViewMessageProtocol';

export interface LogLine {
  id: string;
  text: string;
  type: 'info' | 'error' | 'stream' | 'system' | 'tool' | 'hook';
  title?: string;
  status?: string;
}

interface ConsoleViewProps {
  logs: LogLine[];
  status: string;
  badge: string;
  metrics: SystemMetrics;
  bottomRef?: RefObject<HTMLDivElement | null>;
  onSend: (text: string) => void;
  isHidden: boolean;
}

export function ConsoleView({ logs, status, badge, metrics, bottomRef, onSend, isHidden }: ConsoleViewProps) {
  if (isHidden) return null;

  return (
    <>
      <div id="status-container">
        <div className="status-badge">{badge}</div>
        <div className="status-text">{status}</div>
      </div>
      <ContextHeader metrics={metrics} />
      <div id="output" className="terminal-view">
        {logs.map(log => {
          if (log.type === 'stream') {
            return <MarkdownOutput key={log.id} content={log.text} />;
          }
          if (log.type === 'system') {
            return (
              <div key={log.id} className="log-line system">
                <SovereignTyping text={log.text} />
              </div>
            );
          }
          if (log.type === 'tool' || log.type === 'hook') {
              return <ActionRow key={log.id} title={log.title || 'Action'} type={log.type} content={log.text} status={log.status} defaultExpanded={true} />;
          }
          return (
            <div key={log.id} className={`log-line ${log.type}`}>
              {log.text}
            </div>
          );
        })}
        {bottomRef && <div ref={bottomRef} />}
      </div>
      <SovereignInput onSend={onSend} />
    </>
  );
}
