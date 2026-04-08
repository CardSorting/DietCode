import { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent, ChangeEvent } from 'react';
import { SendIcon, Paperclip, FileText, X, Sparkles, Sliders, History, Activity, Trash2, Zap } from 'lucide-react';

interface SovereignInputProps {
  onSend: (text: string, attachments?: unknown[]) => void;
  disabled?: boolean;
}

const COMMANDS = [
  { id: 'registry', label: 'OPEN_REGISTRY', icon: Sliders, desc: 'Access Intelligence Provisioning' },
  { id: 'history', label: 'OPEN_CHRONOLOGY', icon: History, desc: 'Temporal Node Navigation' },
  { id: 'diag', label: 'TOGGLE_DIAG_HUD', icon: Activity, desc: 'High-Fidelity Telemetry' },
  { id: 'clear', label: 'PURGE_CONSOLE', icon: Trash2, desc: 'Clear active session logs' },
  { id: 'reboot', label: 'SYSTEM_REBOOT', icon: Zap, desc: 'Reset neural link connection' }
];

interface Attachment {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export function SovereignInput({ onSend, disabled }: SovereignInputProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [showOracle, setShowOracle] = useState(false);
  const [oracleIndex, setOracleIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showOracle) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setOracleIndex(i => (i + 1) % COMMANDS.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setOracleIndex(i => (i - 1 + COMMANDS.length) % COMMANDS.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        execCommand(COMMANDS[oracleIndex].id);
        return;
      }
      if (e.key === 'Escape') { setShowOracle(false); return; }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const execCommand = (id: string) => {
     setText(`/${id} `);
     setShowOracle(false);
     textareaRef.current?.focus();
  };

  const handleSend = () => {
    if ((text.trim() || attachments.length > 0) && !disabled) {
      onSend(text.trim(), attachments);
      setText('');
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    }
  };

  useEffect(() => {
    if (!disabled && textareaRef.current) {
       textareaRef.current.focus();
    }
  }, [disabled]);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newAttachments: Attachment[] = Array.from(files).map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    }
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={`sovereign-input-outer ${isFocused ? 'focused' : ''}`}>
      {showOracle && (
        <div className="neural-oracle-palette cinematic-entry" role="menu">
          <div className="oracle-header">NEURAL_COMMAND_ORACLE</div>
          {COMMANDS.map((cmd, i) => {
            const Icon = cmd.icon;
            return (
              <div 
                key={cmd.id} 
                className={`oracle-item ${i === oracleIndex ? 'active' : ''}`}
                onClick={() => execCommand(cmd.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && execCommand(cmd.id)}
                onMouseEnter={() => setOracleIndex(i)}
                tabIndex={0}
                role="menuitem"
              >
                <Icon size={14} className="icon-cyan" />
                <div className="cmd-meta">
                   <span className="cmd-label">{cmd.label}</span>
                   <span className="cmd-desc">{cmd.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="attachment-preview-area">
          {attachments.map((file, i) => (
            <div key={`${file.name}-${file.lastModified}-${i}`} className="attachment-chip">
              <FileText size={12} />
              <span className="chip-label">{file.name}</span>
              <button type="button" className="remove-chip" onClick={() => removeAttachment(i)}>
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="sovereign-input-container">
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          multiple 
          onChange={handleFileChange} 
        />
        <button 
          type="button"
          className={`sovereign-attachment-btn ${attachments.length > 0 ? 'active' : ''}`}
          title="Attach files"
          onClick={handleFileClick}
          disabled={disabled}
        >
          <Paperclip size={18} />
        </button>
        <div className="textarea-wrapper">
          <textarea
            ref={textareaRef}
            className="sovereign-textarea"
            value={text}
            onChange={(e) => {
              const val = e.target.value;
              setText(val);
              setShowOracle(val.startsWith('/'));
              handleInput();
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Processing..." : "Describe your next move..."}
            disabled={disabled}
            rows={1}
          />
          {!text && !disabled && (
               <div className="input-hint">
                  <Sparkles size={12} className="icon-magenta" />
                  <span>Ctrl+Enter to newline</span>
               </div>
          )}
        </div>
        <button 
          type="button"
          className={`sovereign-send-btn ${(text.trim() || attachments.length > 0) ? 'active' : ''}`}
          onClick={handleSend}
          disabled={(!text.trim() && attachments.length === 0) || disabled}
        >
          <SendIcon size={18} />
        </button>
      </div>
    </div>
  );
}


