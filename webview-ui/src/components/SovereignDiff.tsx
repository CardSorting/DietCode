/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { useMemo } from 'react';
import { FileText, Plus, Minus } from 'lucide-react';

interface DiffLine {
  type: 'add' | 'del' | 'context';
  content: string;
  num?: number;
}

export function SovereignDiff({ content }: { content: string }) {
  const parsed = useMemo(() => {
    try {
      if (!content) return null;
      const data = JSON.parse(content);
      
      // Handle legacy/simple DietCode structure
      if (data.targetContent !== undefined && data.replacementContent !== undefined) {
        const lines: DiffLine[] = [];
        const tLines = data.targetContent.split('\n');
        const rLines = data.replacementContent.split('\n');
        
        for (const l of tLines) {
           lines.push({ type: 'del', content: l });
        }
        for (const l of rLines) {
           lines.push({ type: 'add', content: l });
        }
        
        return { file: data.targetFile as string, lines };
      }
    } catch {
      // Not JSON, continue to raw parser
    }

    // Fallback for raw text diffs (naive unified parser)
    if (typeof content === 'string' && (content.startsWith('---') || content.includes('@@'))) {
      const lines: DiffLine[] = [];
      const rawLines = content.split('\n');
      for (const l of rawLines) {
        if (l.startsWith('+') && !l.startsWith('+++')) lines.push({ type: 'add', content: l.slice(1) });
        else if (l.startsWith('-') && !l.startsWith('---')) lines.push({ type: 'del', content: l.slice(1) });
        else if (!l.startsWith('---') && !l.startsWith('+++') && !l.startsWith('@@')) lines.push({ type: 'context', content: l });
      }
      return { lines, file: undefined as string | undefined };
    }
    
    return null;
  }, [content]);

  if (!parsed) {
    return <pre className="action-payload-pre">{content}</pre>;
  }

  return (
    <div className="sovereign-diff-container high-fidelity">
      {parsed.file && (
        <div className="diff-file-tag">
          <FileText size={12} className="icon-cyan" />
          <span>{parsed.file}</span>
        </div>
      )}
      <div className="sovereign-diff-block">
        {parsed.lines.map((line, i) => (
          <div key={`${line.type}-${i}`} className={`diff-line-wrapper ${line.type}`}>
            <div className={`diff-marker-col ${line.type}`}>
               {line.type === 'add' ? <Plus size={10} /> : line.type === 'del' ? <Minus size={10} /> : null}
            </div>
            <div className="diff-line-num">{i + 1}</div>
            <div className="diff-code-col">
               <span className="diff-code-text">{line.content}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

