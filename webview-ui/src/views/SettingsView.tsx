import { X, Save, ShieldCheck, AlertCircle, Loader2, Eye, EyeOff, Cpu, Box, HardDrive, Globe, Fingerprint, Lock, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSovereignBridge, useSovereignMessage } from '../hooks/useSovereignBridge';
import { useSovereign } from '../hooks/useSovereign';
import { WebViewMessageType, WebViewRequestType } from '../types/WebViewMessageProtocol';
import type { SovereignSettings, LLMProviderConfig } from '../types/WebViewMessageProtocol';

interface SettingsViewProps {
  onClose: () => void;
}

export const SettingsView = ({ onClose }: SettingsViewProps) => {
  const [providers, setProviders] = useState<LLMProviderConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [autoApprove, setAutoApprove] = useState(false);
  const [neuralDepth, setNeuralDepth] = useState<'shallow' | 'standard' | 'deep'>('standard');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { coreTheme, setCoreTheme } = useSovereign();
  const { postRequest, requestWithResponse } = useSovereignBridge();

  useEffect(() => {
    postRequest(WebViewRequestType.GET_SETTINGS);
  }, [postRequest]);

  useSovereignMessage<{ settings: SovereignSettings }>(WebViewMessageType.SETTINGS_LOADED, (payload) => {
    if (payload.settings) {
      setProviders(payload.settings.providers || []);
      setSelectedProvider(payload.settings.selectedProvider || '');
      setAutoApprove(!!payload.settings.autoApprove);
      setNeuralDepth(payload.settings.neuralDepth || 'standard');
    }
  });

  const handleProviderToggle = (id: string) => {
    setProviders(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  const handleApiKeyChange = (id: string, value: string) => {
    setProviders(prev => prev.map(p => p.id === id ? { ...p, apiKey: value } : p));
  };

  const toggleKeyVisibility = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = () => {
    postRequest(WebViewRequestType.SAVE_SETTINGS, { 
      providers, 
      selectedProvider, 
      autoApprove, 
      neuralDepth 
    });
    onClose();
  };

  const handleTestConnection = async () => {
    const activeProvider = providers.find(p => p.id === selectedProvider);
    if (!activeProvider?.apiKey) {
      setTestResult({ success: false, message: 'API_KEY_REQUIRED_FOR_ORCHESTRATION' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const result = await requestWithResponse<{ success: boolean; error?: string }>(
        WebViewRequestType.TEST_CONNECTION,
        WebViewMessageType.STATE,
        { providerId: selectedProvider, apiKey: activeProvider.apiKey }
      );

      if (result.success) {
        setTestResult({ success: true, message: `CONNECTION_ESTABLISHED: ${activeProvider.name}` });
      } else {
        setTestResult({ success: false, message: result.error || 'CONNECTION_FAILURE' });
      }
    } catch {
      setTestResult({ success: false, message: 'ORCHESTRATION_TIMEOUT' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="view-container registry-view cinematic-entry">
      <div className="view-header registry-header">
         <div className="profile-badge-cluster">
            <div className="biometric-seal">
               <Fingerprint size={32} className="icon-cyan shadow-glow" />
            </div>
            <div className="identity-text">
               <h2 className="sovereign-id">SOVEREIGN_ID: #D8-X991</h2>
               <span className="clearance-level">CLEARANCE_LEVEL: OMEGA_IV</span>
            </div>
         </div>
         <div className="alignment-selector">
            <span className="tuning-label">ALIGNMENT_TUNING</span>
            <div className="alignment-row">
               <button 
                  type="button"
                  className={`alignment-btn cyan ${coreTheme === 'cyan' ? 'active' : ''}`}
                  onClick={() => setCoreTheme('cyan')}
                  title="Cyan: Intellect Coherence"
               />
               <button 
                  type="button"
                  className={`alignment-btn amber ${coreTheme === 'amber' ? 'active' : ''}`}
                  onClick={() => setCoreTheme('amber')}
                  title="Amber: System Stability"
               />
               <button 
                  type="button"
                  className={`alignment-btn crimson ${coreTheme === 'crimson' ? 'active' : ''}`}
                  onClick={() => setCoreTheme('crimson')}
                  title="Crimson: Power Response"
               />
            </div>
         </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close registry">
          <X size={18} />
        </button>
      </div>

      <div className="view-content registry-grid">
        <div className="registry-section module-rack">
          <h3 className="section-label">AI_PROVISIONING_RACK</h3>
          <div className="provider-modules">
            {providers.map((provider) => (
              <button 
                type="button"
                key={provider.id} 
                className={`registry-module ${provider.enabled ? 'powered' : 'standby'} ${selectedProvider === provider.id ? 'active-link' : ''}`}
                onClick={() => provider.enabled && setSelectedProvider(provider.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && provider.enabled && setSelectedProvider(provider.id)}
                tabIndex={provider.enabled ? 0 : -1}
              >
                <div className="module-status-led" />
                <div className="module-inner">
                  <div className="module-header">
                    <div className="module-info">
                       <span className="module-moniker">{provider.name}</span>
                       <div className="module-badges">
                          <span className="badge-tag">LLM</span>
                          {provider.enabled && <span className="badge-tag glow">REASONING</span>}
                       </div>
                    </div>
                    <div className="module-ops">
                      <label className="switch mini">
                        <input type="checkbox" checked={provider.enabled} onClick={(e) => e.stopPropagation()} onChange={() => handleProviderToggle(provider.id)} />
                        <span className="slider round" />
                      </label>
                    </div>
                  </div>
                  
                  {provider.enabled && (
                    <div className="module-body">
                      <div className="key-slot">
                        <Lock size={10} className="text-muted" />
                        <input 
                          type={showKeys[provider.id] ? 'text' : 'password'}
                          placeholder="API_KEY_SECURED"
                          className="registry-input"
                          value={provider.apiKey || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleApiKeyChange(provider.id, e.target.value)}
                        />
                        <button 
                          type="button" 
                          className="key-peek"
                          onClick={(e) => { e.stopPropagation(); toggleKeyVisibility(provider.id); }}
                        >
                          {showKeys[provider.id] ? <EyeOff size={10} /> : <Eye size={10} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="registry-section peripheral-rack">
          <h3 className="section-label">PERIPHERAL_INTELLIGENCE</h3>
          <div className="peripheral-grid">
             <div className="peripheral-module active">
                <Box size={14} className="icon-cyan" />
                <span className="p-label">FILE_SYSTEM</span>
                <div className="p-status healthy" />
             </div>
             <div className="peripheral-module active">
                <HardDrive size={14} className="icon-cyan" />
                <span className="p-label">SHELL_ACCESS</span>
                <div className="p-status healthy" />
             </div>
             <div className="peripheral-module active">
                <Globe size={14} className="icon-magenta" />
                <span className="p-label">WEB_ORACLE</span>
                <div className="p-status healthy" />
             </div>
             <div className="peripheral-module active">
                <Cpu size={14} className="icon-cyan" />
                <span className="p-label">MCP_MODULES</span>
                <div className="p-status warning" />
             </div>
          </div>

          <div className="governance-section">
            <h3 className="section-label">GOVERNANCE_PROTOCOL</h3>
            <div className="governance-item">
               <div className="item-meta">
                  <span className="item-title">AUTO_APPROVE_TOOLS</span>
                  <span className="item-desc">Allow agent to bypass manual confirmation for core capabilities.</span>
               </div>
               <label className="switch mini">
                  <input type="checkbox" checked={autoApprove} onChange={e => setAutoApprove(e.target.checked)} />
                  <span className="slider round" />
               </label>
            </div>
          </div>
        </div>
      </div>

      <div className="registry-footer">
        <div className="footer-actions">
          <button 
            type="button" 
            className="registry-btn diag" 
            onClick={handleTestConnection}
            disabled={testing || !selectedProvider}
          >
            {testing ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />} 
            {testing ? 'PINGING...' : 'TEST_UPLINK'}
          </button>
          
          <button type="button" className="registry-btn commit" onClick={handleSave}>
            <Save size={12} /> COMMIT_CHANGES
          </button>
        </div>

        {testResult && (
          <div className={`registry-status-bar ${testResult.success ? 'healthy' : 'degraded'}`}>
            {testResult.success ? <Zap size={10} /> : <AlertCircle size={10} />}
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  );
}

