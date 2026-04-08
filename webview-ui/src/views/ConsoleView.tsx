import { useEffect, useRef, useState } from 'react';
import { SovereignInput } from '../components/SovereignInput';
import { ContextHeader } from '../components/ContextHeader';
import { SovereignRow } from '../components/SovereignRow';
import { useSovereign } from '../hooks/useSovereign';
import { BrainCircuit, Search, X } from 'lucide-react';
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
  metrics: SystemMetrics;
  onSend: (text: string) => void;
  isHidden: boolean;
}

export function ConsoleView({ logs, metrics, onSend, isHidden }: ConsoleViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isThinking } = useSovereign();
  const [filterQuery, setFilterQuery] = useState('');

  // Auto-scroll to bottom on new logs or thinking state change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isThinking]);

  if (isHidden) return null;

  const filteredLogs = logs.filter(log => {
    const matchesQuery = log.text.toLowerCase().includes(filterQuery.toLowerCase()) || 
                         (log.title?.toLowerCase() || '').includes(filterQuery.toLowerCase());
    return matchesQuery;
  });

  return (
    <div className="console-view-wrapper">
      <ContextHeader metrics={metrics} />

      <div className="content-area">
        <div className="filter-area">
          <div className="filter-wrapper">
            <Search size={16} className="filter-icon" />
            <input 
              type="text" 
              placeholder="Filter chat history..." 
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="filter-input"
            />
            {filterQuery && (
              <button type="button" className="clear-filter" onClick={() => setFilterQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div id="output" className="terminal-view" ref={scrollRef}>
          <div className="output-inner">
            {filteredLogs.map(log => (
              <SovereignRow key={log.id} log={log} />
            ))}
            {isThinking && (
              <div className="thinking-row">
                <BrainCircuit size={16} className="thinking-icon" />
                <div className="thinking-content">Thinking...</div>
              </div>
            )}
            {filteredLogs.length === 0 && logs.length > 0 && (
              <div className="filter-message">No matching messages</div>
            )}
          </div>
        </div>
      </div>
      
      <SovereignInput onSend={onSend} />
    </div>
  );
}



