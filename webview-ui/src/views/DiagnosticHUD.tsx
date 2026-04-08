import { X, Activity, Cpu, Zap, Share2, BarChart3, LineChart, Terminal, Network } from 'lucide-react';
import { useSovereign } from '../hooks/useSovereign';
import { SwarmTopology } from '../components/SwarmTopology';

interface DiagnosticHUDProps {
  onClose: () => void;
}

export function DiagnosticHUD({ onClose }: DiagnosticHUDProps) {
  const { metrics, logs, isThinking } = useSovereign();

  // Simulated diagnostic data based on actual metrics
  const tps = isThinking ? ((metrics.neuralLoad % 20) + 40.5).toFixed(1) : '0.0';
  const latency = isThinking ? ((metrics.neuralLoad % 100) + 200).toFixed(0) : '--';
  const contextUsage = ((metrics.neuralLoad / metrics.neuralTotal) * 100).toFixed(1);

  // Extract recent tool/hook executions for the trace
  const recentTrace = logs
    .filter(log => log.type === 'tool' || log.type === 'hook' || log.type === 'system')
    .slice(-5)
    .reverse();

  return (
    <div className="diagnostic-hud-overlay cinematic-entry">
      <div className="hud-grid-background" />
      
      <div className="hud-header">
        <div className="hud-title-group">
          <Activity size={20} className="icon-magenta pulse-waiting" />
          <h2 className="hud-title shimmer-text">NEURAL_DIAGNOSTIC_HUD_v1.0</h2>
        </div>
        <button type="button" className="icon-btn" onClick={onClose}>
          <X size={24} />
        </button>
      </div>

      <div className="hud-content">
        <div className="hud-top-gauges">
           <div className="hud-stat-box">
              <span className="stat-label">TOKEN_VELOCITY</span>
              <div className="stat-value-row">
                 <Zap size={16} className="icon-cyan" />
                 <span className="stat-value">{tps}</span>
                 <span className="stat-unit">TPS</span>
              </div>
              <div className="stat-v-bar">
                 <div className="stat-v-fill" style={{ width: `${(Number.parseFloat(tps) / 60) * 100}%` }} />
              </div>
           </div>

           <div className="hud-stat-box">
              <span className="stat-label">INFERENCE_LATENCY</span>
              <div className="stat-value-row">
                 <LineChart size={16} className="icon-magenta" />
                 <span className="stat-value">{latency}</span>
                 <span className="stat-unit">MS</span>
              </div>
              <div className="stat-v-bar">
                 <div className="stat-v-fill magenta" style={{ width: isThinking ? '65%' : '0%' }} />
              </div>
           </div>

           <div className="hud-stat-box">
              <span className="stat-label">CONTEXT_SATURATION</span>
              <div className="stat-value-row">
                 <BarChart3 size={16} className="icon-cyan" />
                 <span className="stat-value">{contextUsage}</span>
                 <span className="stat-unit">%</span>
              </div>
              <div className="stat-v-bar">
                 <div className="stat-v-fill" style={{ width: `${contextUsage}%` }} />
              </div>
           </div>
        </div>

        <div className="hud-main-grid">
           <div className="hud-panel topology-panel">
              <div className="panel-header">
                 <Network size={14} className="icon-cyan" />
                 <span>HIVE_SWARM_TOPOLOGY</span>
              </div>
              <SwarmTopology />
           </div>

           <div className="hud-panel trace-panel">
              <div className="panel-header">
                 <Share2 size={14} className="icon-magenta" />
                 <span>NEURAL_TRACE_LINEAGE</span>
              </div>
              <div className="trace-list">
                 {recentTrace.map((entry, i) => (
                    <div key={entry.id} className="trace-item" style={{ animationDelay: `${i * 0.1}s` }}>
                       <div className="trace-meta">
                          <span className="trace-type">{entry.type.toUpperCase()}</span>
                          <span className="trace-id">#{entry.id.slice(-4).toUpperCase()}</span>
                       </div>
                       <div className="trace-content truncate">{entry.title || entry.text}</div>
                    </div>
                 ))}
                 {recentTrace.length === 0 && <div className="empty-trace">NO_ACTIVE_TRACE_DETECTED</div>}
              </div>
              <div className="hud-terminal-preview">
                 <Terminal size={12} className="icon-cyan" />
                 <span>TERMINAL_ECHO: {logs.length ? `${logs[logs.length - 1].text.slice(0, 30)}...` : 'READY'}</span>
              </div>
           </div>
        </div>
      </div>

      <div className="hud-footer">
          <div className="hud-scanline" />
          <div className="hud-meta-row">
             <Cpu size={12} className="icon-magenta" />
             <span>DIETCODE_SOVEREIGN_HIVE_v2.5 {'//'} SECURE_ORCHESTRATION_ENFORCED</span>
          </div>
      </div>
    </div>
  );
}

