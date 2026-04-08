import { useEffect, useRef, useState } from 'react';
import { SovereignInput } from '../components/SovereignInput';
import { ContextHeader } from '../components/ContextHeader';
import { SovereignRow } from '../components/SovereignRow';
import { useSovereign } from '../hooks/useSovereign';
import { BrainCircuit, Search, Filter, X } from 'lucide-react';
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
  onSend: (text: string) => void;
  isHidden: boolean;
}

export function ConsoleView({ logs, status, badge, metrics, onSend, isHidden }: ConsoleViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isThinking } = useSovereign();
  const [filterQuery, setFilterQuery] = useState('');
  const [activeFilterType, setActiveFilterType] = useState<string | null>(null);

  // Auto-scroll to bottom on new logs or thinking state change
  // biome-ignore lint/correctness/useExhaustiveDependencies: logs and isThinking are triggers for auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isThinking]);

  if (isHidden) return null;

  const filteredLogs = logs.filter(log => {
    const matchesQuery = log.text.toLowerCase().includes(filterQuery.toLowerCase()) || 
                         (log.title?.toLowerCase() || '').includes(filterQuery.toLowerCase());
    const matchesType = activeFilterType ? log.type === activeFilterType : true;
    return matchesQuery && matchesType;
  });

  const filterTypes = ['tool', 'error', 'hook', 'system'];

  return (
    <div className="console-view-wrapper">
      <div id="status-container">
        <div className="status-indicator-ring">
          <div className="status-badge">{badge}</div>
        </div>
        <div className="status-text">{status}</div>
      </div>
      
      <ContextHeader metrics={metrics} />

      <div className="neural-filter-dock">
         <div className="filter-input-wrapper">
            <Search size={12} className="icon-cyan" />
            <input 
              type="text" 
              placeholder="NEURAL_LOG_FILTER..." 
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="neural-filter-input"
            />
            {filterQuery && (
              <button type="button" className="clear-filter" onClick={() => setFilterQuery('')}>
                <X size={10} />
              </button>
            )}
         </div>
         <div className="filter-tags">
            <Filter size={10} className="icon-muted" />
            {filterTypes.map(type => (
               <button 
                  type="button"
                  key={type} 
                  className={`filter-chip ${activeFilterType === type ? 'active' : ''}`}
                  onClick={() => setActiveFilterType(activeFilterType === type ? null : type)}
               >
                  {type.toUpperCase()}
               </button>
            ))}
         </div>
      </div>
      
      <div id="output" className="terminal-view" ref={scrollRef}>
        <div className="output-inner">
          {filteredLogs.map(log => (
            <SovereignRow key={log.id} log={log} />
          ))}
          {isThinking && (
            <div className="sovereign-row system neural-thinking-row">
              <div className="row-icon system pulse-waiting"><BrainCircuit size={14} /></div>
              <div className="row-content">
                <span className="shimmer-text">INTELLECT_PROCESSING...</span>
              </div>
            </div>
          )}
          {filteredLogs.length === 0 && logs.length > 0 && (
            <div className="empty-filter-msg">NO_MATCHING_NEURAL_LOGS</div>
          )}
        </div>
      </div>
      
      <SovereignInput onSend={onSend} />
    </div>
  );
}



