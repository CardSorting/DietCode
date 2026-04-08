import { X, Save, ShieldCheck, AlertCircle, Loader2, Eye, EyeOff, Cpu, Box, HardDrive, Globe, Lock, Zap } from 'lucide-react';
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
      autoApprove 
    });
    onClose();
  };

  const handleTestConnection = async () => {
    const activeProvider = providers.find(p => p.id === selectedProvider);
    if (!activeProvider?.apiKey) {
      setTestResult({ success: false, message: 'API key is required' });
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
        setTestResult({ success: true, message: 'Connection successful' });
      } else {
        setTestResult({ success: false, message: result.error || 'Connection failed' });
      }
    } catch {
      setTestResult({ success: false, message: 'Connection timed out' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="settings-dialog">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </div>

      <div className="settings-content">
        {/* Connected AI Models Section */}
        <div className="settings-section">
          <h2 className="section-title">Connected AI Models</h2>
          
          <div className="models-list">
            {providers.map((provider) => (
              <div key={provider.id} className="model-card">
                <div className="model-header">
                  <div className="model-title-group">
                    <span className="model-name">{provider.name}</span>
                    {provider.enabled && <span className="enabled-badge">Active</span>}
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={provider.enabled} 
                      onClick={(e) => e.stopPropagation()} 
                      onChange={() => handleProviderToggle(provider.id)} 
                    />
                    <span className="slider" />
                  </label>
                </div>

                {provider.enabled && (
                  <div className="model-body">
                    <label className="field-label">
                      <Lock size={14} />
                      <span>API Key</span>
                    </label>
                    <div className="api-key-field">
                      <input 
                        type={showKeys[provider.id] ? 'text' : 'password'}
                        placeholder="Enter your API key"
                        className="api-key-input"
                        value={provider.apiKey || ''}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleApiKeyChange(provider.id, e.target.value)}
                      />
                      <button 
                        type="button" 
                        className="visibility-toggle"
                        onClick={(e) => { e.stopPropagation(); toggleKeyVisibility(provider.id); }}
                        aria-label="Toggle key visibility"
                      >
                        {showKeys[provider.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Capabilities Section */}
        <div className="settings-section">
          <h2 className="section-title">What It Can Do</h2>
          <div className="capabilities-grid">
            <div className="capability-card">
              <Box size={24} className="capability-icon" />
              <span className="capability-name">File Access</span>
            </div>
            <div className="capability-card">
              <HardDrive size={24} className="capability-icon" />
              <span className="capability-name">Terminal</span>
            </div>
            <div className="capability-card">
              <Globe size={24} className="capability-icon" />
              <span className="capability-name">Web Search</span>
            </div>
            <div className="capability-card">
              <Cpu size={24} className="capability-icon warning" />
              <span className="capability-name">Tools</span>
            </div>
          </div>
        </div>

        {/* Safety Section */}
        <div className="settings-section">
          <h2 className="section-title">Safety & Controls</h2>
          <div className="control-item">
            <div className="control-info">
              <span className="control-label">Allow automatic actions</span>
              <span className="control-description">
                The assistant will act without asking for permission
              </span>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={autoApprove} 
                onChange={(e) => setAutoApprove(e.target.checked)} 
              />
              <span className="slider" />
            </label>
          </div>
        </div>

        {/* Interface Theme Section */}
        <div className="settings-section">
          <h2 className="section-title">Interface Theme</h2>
          <div className="theme-selector">
            <button 
              type="button"
              className={`theme-btn ${coreTheme === 'cyan' ? 'active' : ''}`}
              onClick={() => setCoreTheme('cyan')}
              aria-label="Cyan theme"
            />
            <button 
              type="button"
              className={`theme-btn ${coreTheme === 'amber' ? 'active' : ''}`}
              onClick={() => setCoreTheme('amber')}
              aria-label="Amber theme"
            />
            <button 
              type="button"
              className={`theme-btn ${coreTheme === 'crimson' ? 'active' : ''}`}
              onClick={() => setCoreTheme('crimson')}
              aria-label="Crimson theme"
            />
          </div>
        </div>
      </div>

      <div className="settings-footer">
        {testResult && (
          <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
            {testResult.success ? <Zap size={14} /> : <AlertCircle size={14} />}
            <span>{testResult.message}</span>
          </div>
        )}
        
        <div className="footer-actions">
          <button 
            type="button" 
            className="action-button secondary" 
            onClick={handleTestConnection}
            disabled={testing || !selectedProvider}
          >
            {testing ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />} 
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          
          <button type="button" className="action-button primary" onClick={handleSave}>
            <Save size={16} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

