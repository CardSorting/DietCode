import { TerminalSquare, Settings as SettingsIcon, History, Radio, Activity } from 'lucide-react';
import { ConsoleView } from './views/ConsoleView';
import { SettingsView } from './views/SettingsView';
import { DiagnosticHUD } from './views/DiagnosticHUD';
import { CheckpointHistoryView } from './views/CheckpointHistoryView';
import { SovereignProvider } from './context/SovereignContext';
import { useSovereign } from './hooks/useSovereign';
import { VisualEqualizer } from './components/VisualEqualizer';
import { BiometricScan } from './components/BiometricScan';
import { useState, useCallback } from 'react';

function AppContent() {
  const { 
    activeView, 
    setActiveView, 
    status, 
    badge, 
    logs, 
    metrics, 
    isLinkHealthy, 
    isThinking,
    handleSend,
    coreTheme
  } = useSovereign();

  const [showHud, setShowHud] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [lastView, setLastView] = useState(activeView);

  // Trigger scan when view changes (render-time adjustment)
  if (activeView !== lastView) {
    setIsScanning(true);
    setLastView(activeView);
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
     const { clientX, clientY } = e;
     const x = (clientX / window.innerWidth - 0.5) * 20; // Max 10px shift
     const y = (clientY / window.innerHeight - 0.5) * 20;
     setMousePos({ x, y });
  }, []);

  const isHistoryVisible = activeView === 'history';

  return (
    <div 
      className={`neural-backbone-wrapper ${isThinking ? 'thinking-pulse' : ''} theme-${coreTheme}`}
      onMouseMove={handleMouseMove}
    >
      {isScanning && <BiometricScan onComplete={() => setIsScanning(false)} />}
      
      <div 
        className="neural-backbone-bg"
        style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
      >
        <svg className="backbone-lattice" viewBox="0 0 100 100" preserveAspectRatio="none">
          <title>Neural Backbone Lattice</title>
          <pattern id="lattice" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="0.5" fill="currentColor" />
            <path d="M 5 0 L 5 10 M 0 5 L 10 5" stroke="currentColor" strokeWidth="0.1" />
          </pattern>
          <rect x="0" y="0" width="100" height="100" fill="url(#lattice)" />
        </svg>
      </div>

      <div className="content command-center">
        <header className="cinematic-entry">
          <div className="logo-container">
            <div className="logo">[ SOVEREIGN HIVE ]</div>
            <h1 className="title">DIETCODE</h1>
          </div>
          <div className="header-nav">
            <button 
              type="button" 
              className={`icon-btn ${activeView === 'console' ? 'active' : ''}`} 
              onClick={() => setActiveView('console')}
              title="Terminal Console"
            >
              <TerminalSquare size={18} />
            </button>
            <button 
              type="button" 
              className={`icon-btn ${activeView === 'history' ? 'active' : ''}`} 
              onClick={() => setActiveView('history')}
              title="Neural Chronology"
            >
              <History size={18} />
            </button>
            <button 
              type="button" 
              className={`icon-btn ${activeView === 'settings' ? 'active' : ''}`} 
              onClick={() => setActiveView('settings')}
              title="Intelligence Registry"
            >
              <SettingsIcon size={18} />
            </button>
          </div>
        </header>
        
        <main>
          <ConsoleView 
            logs={logs} 
            status={status} 
            badge={badge} 
            metrics={metrics}
            onSend={handleSend} 
            isHidden={activeView === 'settings'} 
          />
          
          {activeView === 'settings' && (
            <div className="view-overlay">
              <SettingsView onClose={() => setActiveView('console')} />
            </div>
          )}

          {showHud && (
             <div className="view-overlay parallax-hud" style={{ transform: `translate(${-mousePos.x * 0.5}px, ${-mousePos.y * 0.5}px)` }}>
                <DiagnosticHUD onClose={() => setShowHud(false)} />
             </div>
          )}
        </main>

        {/* Dual Pane Sidebar: Persistent Chronology if active */}
        {isHistoryVisible && (
          <aside className="sovereign-sideboard">
             <CheckpointHistoryView onClose={() => setActiveView('console')} />
          </aside>
        )}
        
        <footer>
          <div className="metrics diagnostic-grid">
            <button 
              type="button"
              className="metric-group clickable" 
              onClick={() => setShowHud(!showHud)} 
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setShowHud(!showHud)}
              tabIndex={0}
              title="Toggle Diagnostic HUD"
            >
              <Radio size={10} className={isLinkHealthy ? 'icon-cyan pulse-waiting' : 'icon-error'} />
              <span className={`metric health-indicator ${isLinkHealthy ? 'healthy' : 'unhealthy'}`}>
                UPLINK: {isLinkHealthy ? 'STABLE' : 'DEGRADED'}
              </span>
            </button>
            <button 
              type="button"
              className="metric-group desktop-only clickable" 
              onClick={() => setShowHud(true)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setShowHud(true)}
              tabIndex={0}
            >
               <Activity size={10} className={isThinking ? 'icon-magenta pulse-waiting' : 'icon-cyan'} />
               <span className="metric">PROC: {isThinking ? 'BUSY' : 'IDLE'}</span>
               <VisualEqualizer active={isThinking} />
               <span className="metric">BUFFER: {logs.length}L</span>
            </button>
            <div className="metric-group">
              <span className="metric">SOVEREIGN_HIVE_v2.5</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}




function App() {
  return (
    <SovereignProvider>
      <AppContent />
    </SovereignProvider>
  );
}

export default App;



