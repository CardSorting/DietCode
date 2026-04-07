import { X, Database, Clock, ArrowLeft, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSovereignBridge } from '../hooks/useSovereignBridge';
import { WebViewMessageType, WebViewRequestType } from '../types/WebViewMessageProtocol';
import type { Checkpoint } from '../types/WebViewMessageProtocol';

interface CheckpointHistoryViewProps {
  onClose: () => void;
}

export function CheckpointHistoryView({ onClose }: CheckpointHistoryViewProps) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const { postRequest, useMessageListener } = useSovereignBridge();

  useEffect(() => {
    setLoading(true);
    postRequest(WebViewRequestType.LOAD_CHECKPOINTS);
  }, [postRequest]);

  useMessageListener(WebViewMessageType.CHECKPOINTS_LOADED, (payload) => {
    const checkedPayload = payload as { checkpoints?: Checkpoint[] };
    setCheckpoints(checkedPayload.checkpoints || []);
    setLoading(false);
  });

  const handleRestore = (id: string) => {
    const win = window as any;
    if (win.confirm(`Are you sure you want to restore to version ${id.substring(0, 8)}? Current progress may be overwritten.`)) {
      postRequest(WebViewRequestType.RESTORE_CHECKPOINT, { id });
      onClose();
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1rem' }}>
          <Database size={16} /> History
        </h2>
        <button type="button" className="icon-btn" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="view-content history-list">
        {loading ? (
          <div className="empty-state">
            <Loader2 className="animate-spin" size={24} />
            <div style={{ marginTop: '0.5rem' }}>Loading history...</div>
          </div>
        ) : checkpoints.length === 0 ? (
          <div className="empty-state">No history found for this project.</div>
        ) : (
          checkpoints.map((cp) => (
            <div key={cp.id} className="history-card">
              <div className="history-card-header">
                <span className="chk-id">#{cp.id.substring(0, 8)}</span>
                <span className="chk-time"><Clock size={12}/> {new Date(cp.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="chk-summary">{cp.summary}</div>
              <button 
                type="button" 
                className="restore-btn"
                onClick={() => handleRestore(cp.id)}
              >
                <ArrowLeft size={14}/> Restore Version
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
