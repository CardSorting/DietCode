import { X, Database, Clock, Loader2, Zap, Fingerprint } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSovereignBridge, useSovereignMessage } from '../hooks/useSovereignBridge';
import { WebViewMessageType, WebViewRequestType } from '../types/WebViewMessageProtocol';
import type { Checkpoint } from '../types/WebViewMessageProtocol';

interface CheckpointHistoryViewProps {
  onClose: () => void;
}

export function CheckpointHistoryView({ onClose }: CheckpointHistoryViewProps) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const { postRequest } = useSovereignBridge();

  useEffect(() => {
    postRequest(WebViewRequestType.LOAD_CHECKPOINTS);
  }, [postRequest]);

  useSovereignMessage<{ checkpoints?: Checkpoint[] }>(WebViewMessageType.CHECKPOINTS_LOADED, (payload) => {
    setCheckpoints(payload.checkpoints || []);
    setLoading(false);
  });

  const handleRestore = (id: string) => {
    if (window.confirm(`INITIATE TEMPORAL RESTORE: ${id.substring(0, 8)}?`)) {
      postRequest(WebViewRequestType.RESTORE_CHECKPOINT, { id });
      onClose();
    }
  };

  return (
    <div className="view-container chronology-view cinematic-entry">
      <div className="view-header">
        <h2 className="view-title shimmer-text">
          <Database size={16} /> NEURAL_CHRONOLOGY
        </h2>
        <button type="button" className="icon-btn" onClick={onClose}><X size={18} /></button>
      </div>
      
      <div className="view-content chronology-ribbon">
        {loading ? (
          <div className="loading-state">
            <Loader2 className="animate-spin icon-cyan" size={32} />
            <div className="shimmer-text">MAPPING_TEMPORAL_NODES...</div>
          </div>
        ) : checkpoints.length === 0 ? (
          <div className="empty-state">No temporal snapshots detected in local hive.</div>
        ) : (
          <div className="timeline-spine">
            {checkpoints.map((cp, i) => (
              <div key={cp.id} className="chronology-node">
                <div className="node-marker">
                   <div className="marker-dot pulse-waiting" />
                   {i < checkpoints.length - 1 && <div className="marker-line" />}
                </div>
                <div className="node-card">
                  <div className="node-header">
                    <div className="node-id-chip">
                       <Fingerprint size={10} />
                       <span>{cp.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                    <span className="node-time"><Clock size={10}/> {new Date(cp.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="node-summary">{cp.summary}</div>
                  <div className="node-actions">
                    <button 
                      type="button" 
                      className="sovereign-btn primary tiny"
                      onClick={() => handleRestore(cp.id)}
                    >
                      <Zap size={12}/> RESTORE_VERSION
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

