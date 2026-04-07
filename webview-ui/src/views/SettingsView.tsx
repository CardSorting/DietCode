import { X, Save, ShieldCheck, AlertCircle, Loader2, Eye, EyeOff, Sliders } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSovereignBridge } from '../hooks/useSovereignBridge';
import { WebViewMessageType, WebViewRequestType } from '../types/WebViewMessageProtocol';
import type { SovereignSettings, LLMProviderConfig } from '../types/WebViewMessageProtocol';

interface SettingsViewProps {
  onClose: () => void;
}

export function SettingsView({ onClose }: SettingsViewProps) {
  const [providers, setProviders] = useState<LLMProviderConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [autoApprove, setAutoApprove] = useState(false);
  const [neuralDepth, setNeuralDepth] = useState<'shallow' | 'standard' | 'deep'>('standard');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { postRequest, useMessageListener, requestWithResponse } = useSovereignBridge();

  useEffect(() => {
    postRequest(WebViewRequestType.GET_SETTINGS);
  }, [postRequest]);

  useMessageListener(WebViewMessageType.SETTINGS_LOADED, (payload: { settings: SovereignSettings }) => {
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
      setTestResult({ success: false, message: 'API Key required to test connection.' });
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
        setTestResult({ success: true, message: `Successfully connected to ${activeProvider.name}` });
      } else {
        setTestResult({ success: false, message: result.error || 'Connection failed.' });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Connection timed out.' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1rem' }}>
          <Sliders size={16} className="text-cyan-400" /> Settings
        </h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close settings">
          <X size={18} />
        </button>
      </div>

      <div className="view-content" style={{ paddingBottom: '90px' }}>
        <div className="settings-section">
          <h3 className="section-title">Primary AI Model</h3>
          <div className="settings-group">
            <label htmlFor="active-provider-select" className="sr-only">Select your primary AI model</label>
            <select 
              id="active-provider-select"
              className="sovereign-select"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
            >
              <option value="" disabled>Choose a provider...</option>
              {providers.filter(p => p.enabled).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <p className="helper-text">This model will be used as the default for all tasks.</p>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="section-title">AI Providers</h3>
          <p className="helper-text">Enable the AI services you want to use and add your API keys.</p>
          <div className="provider-list">
            {providers.map((provider) => (
              <div 
                key={provider.id} 
                className={`provider-card ${provider.enabled ? 'active' : 'disabled'}`}
              >
                <div className="provider-card-header">
                  <div className="provider-info">
                    <span className="provider-name">{provider.name}</span>
                    <span className={`provider-type-tag ${provider.type}`}>{provider.type}</span>
                  </div>
                  <div className="switch-wrapper">
                    <label className="switch">
                      <span className="sr-only">Enable {provider.name}</span>
                      <input type="checkbox" checked={provider.enabled} onChange={() => handleProviderToggle(provider.id)} />
                      <span className="slider round" />
                    </label>
                  </div>
                </div>
                
                {provider.enabled && (
                  <div className="provider-card-body">
                    <div className="api-key-input-wrapper">
                      <label htmlFor={`key-${provider.id}`} className="sr-only">{provider.name} API Key</label>
                      <input 
                        id={`key-${provider.id}`}
                        type={showKeys[provider.id] ? 'text' : 'password'}
                        placeholder={`${provider.id} api key...`}
                        className="sovereign-input-field sm"
                        value={provider.apiKey || ''}
                        onChange={(e) => handleApiKeyChange(provider.id, e.target.value)}
                      />
                      <button 
                        type="button" 
                        className="key-toggle-btn"
                        onClick={() => toggleKeyVisibility(provider.id)}
                        aria-label={showKeys[provider.id] ? "Hide API key" : "Show API key"}
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

        <div className="settings-section">
          <h3 className="section-title">Agent Behavior</h3>
          <div className="settings-group checkbox">
            <input 
              type="checkbox" 
              id="autoApprove" 
              checked={autoApprove} 
              onChange={e => setAutoApprove(e.target.checked)} 
            />
            <label htmlFor="autoApprove">Auto-approve agent actions</label>
          </div>

          <fieldset className="settings-group">
            <legend className="neural-depth-legend">Reasoning Detail</legend>
            <div className="depth-selector">
              {(['shallow', 'standard', 'deep'] as const).map(depth => (
                <button
                  key={depth}
                  type="button"
                  className={`depth-toggle ${neuralDepth === depth ? 'active' : ''}`}
                  onClick={() => setNeuralDepth(depth)}
                  aria-pressed={neuralDepth === depth}
                >
                  {depth.toUpperCase()}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      <div className="settings-footer">
        <div className="settings-actions-row">
          <button 
            type="button" 
            className="sovereign-btn secondary" 
            onClick={handleTestConnection}
            disabled={testing || !selectedProvider}
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} 
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          
          <button type="button" className="sovereign-btn primary" onClick={handleSave}>
            <Save size={16} /> Save Changes
          </button>
        </div>

        {testResult && (
          <div className={`test-result-badge ${testResult.success ? 'success' : 'error'}`}>
            {testResult.success ? <ShieldCheck size={14} /> : <AlertCircle size={14} />}
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  );
}
