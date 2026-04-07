import { Cpu, Zap, Activity } from 'lucide-react';
import type { SystemMetrics } from '../types/WebViewMessageProtocol';

interface ContextHeaderProps {
  metrics: SystemMetrics;
}

export function ContextHeader({ metrics }: ContextHeaderProps) {
  const loadPercentage = Math.round((metrics.neuralLoad / metrics.neuralTotal) * 100);
  const totalDisplay = metrics.neuralTotal > 1000 ? `${(metrics.neuralTotal / 1000).toFixed(0)}k` : metrics.neuralTotal;
  const loadDisplay = metrics.neuralLoad > 1000 ? `${(metrics.neuralLoad / 1000).toFixed(1)}k` : metrics.neuralLoad;

  return (
    <div className="context-header">
      <div className="context-stat">
        <Cpu size={14} className="icon-cyan" />
        <span>AI USAGE: <strong>~{loadPercentage}%</strong> <em>({loadDisplay} / {totalDisplay})</em></span>
      </div>
      <div className="context-stat">
        <Zap size={14} className="icon-magenta" />
        <span>MEMORY CONTEXT: <strong>{metrics.cacheMapping}%</strong></span>
      </div>
      <div className="context-stat desktop-only">
        <Activity size={14} className="icon-cyan" />
        <span>DATABASE: <strong>{metrics.status.toUpperCase()}</strong></span>
      </div>
    </div>
  );
}
