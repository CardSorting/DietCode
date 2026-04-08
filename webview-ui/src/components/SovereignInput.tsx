import { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent, ChangeEvent } from 'react';
import { SendIcon, Paperclip, FileText, X, Sparkles } from 'lucide-react';

interface SovereignInputProps {
  onSend: (text: string, attachments?: unknown[]) => void;
  disabled?: boolean;
}

interface Attachment {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export function SovereignInput({ onSend, disabled }: SovereignInputProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
    <div className="input-container">
      {attachments.length > 0 && (
        <div className="attachment-list">
          {attachments.map((file, i) => (
            <div key={`${file.name}-${file.lastModified}-${i}`} className="attachment-item">
              <FileText size={14} />
              <span className="file-name">{file.name}</span>
              <button type="button" className="remove-attachment" onClick={() => removeAttachment(i)}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="input-wrapper">
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          multiple 
          onChange={handleFileChange} 
        />
        <button 
          type="button"
          className={`attachment-button ${attachments.length > 0 ? 'active' : ''}`}
          title="Attach files"
          onClick={handleFileClick}
          disabled={disabled}
        >
          <Paperclip size={18} />
        </button>
        <div className="textarea-wrapper">
          <textarea
            ref={textareaRef}
            className="message-input"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleInput();
            }}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Processing..." : "Say something..."}
            disabled={disabled}
            rows={1}
          />
          {!text && !disabled && (
              <div className="input-hint">
                 <Sparkles size={12} />
                 <span>Press Enter to send</span>
              </div>
          )}
        </div>
        <button 
          type="button"
          className={`send-button ${(text.trim() || attachments.length > 0) ? 'active' : ''}`}
          onClick={handleSend}
          disabled={(!text.trim() && attachments.length === 0) || disabled}
        >
          <SendIcon size={18} />
        </button>
      </div>
    </div>
  );
}


