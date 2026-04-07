/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { useState, useRef } from 'react';
import type { KeyboardEvent, ChangeEvent } from 'react';
import { SendIcon, Paperclip, FileText, X } from 'lucide-react';

interface SovereignInputProps {
  onSend: (text: string, attachments?: any[]) => void;
  disabled?: boolean;
}

export function SovereignInput({ onSend, disabled }: SovereignInputProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
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
      onSend(text.trim(), attachments as any);
      setText('');
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newAttachments = Array.from(files).map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    }
    // Clear input so same file can be selected again
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="sovereign-input-outer">
      {attachments.length > 0 && (
        <div className="attachment-preview-area">
          {attachments.map((file, i) => (
            <div key={`${file.name}-${i}`} className="attachment-chip">
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
        <textarea
          ref={textareaRef}
          className="sovereign-textarea"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          rows={1}
        />
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
