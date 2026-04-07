import { ChevronRight, ChevronDown, Terminal, Wrench, Check, X } from 'lucide-react';
import { useState } from 'react';
import { useSovereignBridge } from '../hooks/useSovereignBridge';
import { WebViewRequestType } from '../types/WebViewMessageProtocol';
import { SovereignDiff } from './SovereignDiff';

interface ActionRowProps {
  title: string;
  type: 'system' | 'tool' | 'hook';
  content?: string;
  status?: string;
  defaultExpanded?: boolean;
}

export function ActionRow({ title, type, content, status, defaultExpanded = false }: ActionRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { postRequest } = useSovereignBridge();

  const handleApproval = (approved: boolean) => {
    postRequest(WebViewRequestType.TOOL_APPROVAL, { approved });
  };

  const getIcon = () => {
    switch (type) {
      case 'tool': return <Wrench size={14} className={`action-icon tool ${status === 'pending' ? 'pulse-waiting' : ''}`} />;
      case 'system': return <Terminal size={14} className="action-icon system" />;
      case 'hook': return <Terminal size={14} className="action-icon hook" />;
      default: return <Terminal size={14} />;
    }
  };

  return (
    <div className={`action-row-container ${type} ${status === 'pending' ? 'pending-action' : ''}`}>
      <div 
        className="action-row-header" 
        onClick={() => content && setExpanded(!expanded)}
        onKeyDown={(e) => { 
          if ((e.key === 'Enter' || e.key === ' ') && content) { 
            e.preventDefault(); 
            setExpanded(!expanded); 
          } 
        }}
        tabIndex={content ? 0 : undefined}
        role={content ? 'button' : undefined}
        style={{ cursor: content ? 'pointer' : 'default' }}
      >
        <span className="expand-indicator">
          {content ? (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span style={{ width: 14 }} />}
        </span>
        {getIcon()}
        <span className="action-title">{title}</span>
        {status === 'pending' && <span className="action-pending-badge">Awaiting Authorization...</span>}
      </div>
      
      {expanded && content && (
        <div className="action-content">
          {type === 'tool' && content.includes('"replacementContent"') ? (
            <SovereignDiff content={content} />
          ) : (
            <pre className="action-payload-pre">{content}</pre>
          )}
          
          {status === 'pending' && (
            <div className="action-guardrail-actions">
              <button type="button" className="sovereign-btn primary" onClick={() => handleApproval(true)}>
                <Check size={16} /> Approve Execution
              </button>
              <button type="button" className="sovereign-btn danger" onClick={() => handleApproval(false)}>
                <X size={16} /> Reject
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
