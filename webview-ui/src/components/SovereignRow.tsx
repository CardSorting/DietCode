import { Shield, Zap, AlertCircle, Info, FileText } from 'lucide-react';
import { MarkdownOutput } from './MarkdownOutput';
import { SovereignTyping } from './SovereignTyping';
import { ActionRow } from './ActionRow';
import { useSovereignBridge } from '../hooks/useSovereignBridge';
import { WebViewRequestType } from '../types/WebViewMessageProtocol';
import type { LogLine } from '../views/ConsoleView';

interface SovereignRowProps {
  log: LogLine;
}

export const SovereignRow = ({ log }: SovereignRowProps) => {
  const { postRequest } = useSovereignBridge();

  const handlePathClick = (path: string) => {
    // Attempting to open the file via backend tool
    postRequest(WebViewRequestType.EXECUTE_TOOL, { 
      toolName: 'open_file', 
      arguments: { path } 
    });
  };

  const renderTextWithPaths = (text: string) => {
    // Basic regex for file paths (absolute or relative with extension)
    const pathRegex = /((?:\/[^/ ]+)+|\.[^/ ]+\.[^/ ]+)/g;
    const parts = text.split(pathRegex);
    
    if (parts.length === 1) return text;

    return parts.map((part, i) => {
      if (pathRegex.test(part)) {
        return (
          <button 
            type="button"
            // biome-ignore lint/suspicious/noArrayIndexKey: parts generated from split are stable and positional
            key={`path-${part}-${i}`} 
            className="clickable-path" 
            onClick={() => handlePathClick(part)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handlePathClick(part)}
            tabIndex={0}
            title={`Open ${part} in editor`}
          >
            <FileText size={10} className="inline-icon" />
            {part}
          </button>
        );
      }
      return part;
    });
  };

  const renderContent = () => {
    switch (log.type) {
      case 'stream':
        return <MarkdownOutput content={log.text} />;
      
      case 'system':
        return (
          <div className="sovereign-row system cinematic-entry">
            <div className="row-icon system"><Zap size={14} /></div>
            <div className="row-content">
              <SovereignTyping text={log.text} />
            </div>
          </div>
        );

      case 'tool':
      case 'hook':
        return (
          <ActionRow 
            title={log.title || (log.type === 'tool' ? 'Tool Execution' : 'Hook Event')} 
            type={log.type} 
            content={log.text} 
            status={log.status} 
            defaultExpanded={log.status === 'pending' || log.type === 'tool'} 
          />
        );

      case 'error':
        return (
          <div className="sovereign-row error cinematic-entry">
            <div className="row-icon error"><AlertCircle size={14} /></div>
            <div className="row-content error-text">
              {log.text}
            </div>
          </div>
        );

      default: {
        const isUser = !log.text.startsWith('>') && !log.text.startsWith('>>');
        return (
          <div className={`sovereign-row ${isUser ? 'user' : 'info'} cinematic-entry`}>
            <div className="row-icon info">
              {isUser ? <Shield size={14} className="icon-cyan shadow-glow" /> : <Info size={14} />}
            </div>
            <div className="row-content">
              {renderTextWithPaths(log.text)}
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className={`sovereign-row-container ${log.type}`}>
      {renderContent()}
    </div>
  );
};

