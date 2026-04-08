import type { SystemMetrics } from '../types/WebViewMessageProtocol';
import { NeuralGauge } from './NeuralGauge';

interface ContextHeaderProps {
  metrics: SystemMetrics;
}

export function ContextHeader({ metrics }: ContextHeaderProps) {
  const loadPercentage = ((metrics.neuralLoad / metrics.neuralTotal) * 100);

  return (
    <div className="sovereign-context-header instrument-cluster">
      <div className="header-top-row">
        <div className="instrument-group">
          <NeuralGauge 
            value={metrics.neuralLoad} 
            total={metrics.neuralTotal} 
            label="TOKEN_LOAD" 
            size={54} 
            color="cyan" 
          />
          <NeuralGauge 
            value={metrics.cacheMapping} 
            total={100} 
            label="SYNC_MAP" 
            size={54} 
            color="magenta" 
          />
        </div>

        <div className="diagnostic-readout">
          <div className="readout-item">
            <span className="readout-label">SYSTEM_PATH</span>
            <span className="readout-value shimmer-text">CLAUDE-3.5-SONNET</span>
          </div>
          <div className="readout-item">
             <span className="readout-label">HIVE_STABILITY</span>
             <span className={`readout-value ${metrics.status === 'OPTIMAL' ? 'text-success' : 'text-warning'}`}>
               {metrics.status.toUpperCase()}
             </span>
          </div>
          <div className="readout-item desktop-only">
             <span className="readout-label">DIET_COEFF</span>
             <span className="readout-value text-accent-cyan">1.24X_OPTIMIZED</span>
          </div>
        </div>

        <div className="header-status-indicator">
           <div className="status-label">{loadPercentage.toFixed(1)}%</div>
           <span className="indicator-label">NEURAL_READY</span>
        </div>
      </div>
    </div>
  );
}


