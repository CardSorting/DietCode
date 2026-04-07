import { X, Save, ShieldCheck, Zap, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSovereignBridge } from '../hooks/useSovereignBridge';
import { WebViewMessageType, WebViewRequestType } from '../types/WebViewMessageProtocol';
import type { SovereignSettings } from '../types/WebViewMessageProtocol';

interface SettingsViewProps {
  onClose: () => void;
}

export function SettingsView({ onClose }: SettingsViewProps) {
  const [apiKey, setApiKey] = useState('');
  const [autoApprove, setAutoApprove] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { postRequest, useMessageListener, requestWithResponse } = useSovereignBridge();

  useEffect(() => {
    postRequest(WebViewRequestType.GET_SETTINGS);
  }, [postRequest]);

  useMessageListener(WebViewMessageType.SETTINGS_LOADED, (payload: { settings: SovereignSettings }) => {
    if (payload.settings) {
      setApiKey(payload.settings.apiKey || '');
      setAutoApprove(!!payload.settings.autoApprove);
    }
  });

  const handleSave = () => {
    if (apiKey && !apiKey.startsWith('sk-')) {
      alert('Invalid API Key format. Expected sk-...');
      return;
    }

    postRequest(WebViewRequestType.SAVE_SETTINGS, { apiKey, autoApprove });
    onClose();
  };

  const handleTestConnection = async () => {
    if (!apiKey) {
      setTestResult({ success: false, message: 'API Key required for testing.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const result = await requestWithResponse<{ success: boolean; error?: string }>(
        WebViewRequestType.TEST_CONNECTION,
        WebViewMessageType.STATE, // Assuming state update for result for now, can be specialized
        { apiKey }
      );

      if (result.success) {
        setTestResult({ success: true, message: 'Neural uplink established successfully!' });
      } else {
        setTestResult({ success: false, message: result.error || 'Connection failed.' });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Bridge timeout or orchestrator error.' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1rem' }}>
          <Zap size={16} /> DietCode Configuration
        </h2>
        <button type="button" className="icon-btn" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="view-content">
        <div className="settings-group">
          <label htmlFor="apiKey">BroccoliQ Model API Key</label>
          <div style={{ position: 'relative' }}>
            <input 
              id="apiKey"
              type="password" 
              className={`sovereign-input-field ${apiKey && !apiKey.startsWith('sk-') ? 'error' : ''}`}
              placeholder="sk-dict..." 
              value={apiKey} 
              onChange={e => setApiKey((e.target as HTMLInputElement).value)} 
            />
            {apiKey && !apiKey.startsWith('sk-') && (
              <AlertCircle size={14} style={{ position: 'absolute', right: '10px', top: '10px', color: '#ff4444' }} />
            )}
          </div>
        </div>
        
        <div className="settings-group checkbox">
          <input 
            type="checkbox" 
            id="autoApprove" 
            checked={autoApprove} 
            onChange={e => setAutoApprove((e.target as HTMLInputElement).checked)} 
          />
          <label htmlFor="autoApprove">Enable Autonomous Execution Flow</label>
        </div>

        <div className="settings-actions-row">
          <button 
            type="button" 
            className="sovereign-btn secondary" 
            onClick={handleTestConnection}
            disabled={testing || !apiKey}
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} 
            {testing ? 'Probing...' : 'Test Connection'}
          </button>
          
          <button type="button" className="sovereign-btn primary" onClick={handleSave}>
            <Save size={16} /> Save Configuration
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
