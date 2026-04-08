import { ChevronRight, Terminal as TerminalIcon } from 'lucide-react';
/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { useEffect, useMemo, useRef } from 'react';

interface SovereignTerminalProps {
  command: string;
  output: string;
  isExecuting?: boolean;
}

export function SovereignTerminal({ command, output, isExecuting }: SovereignTerminalProps) {
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic for terminal fidelity - 'output' dependency is REQUIRED
  // biome-ignore lint/correctness/useExhaustiveDependencies: output MUST be a dependency for proper scroll behavior
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Basic ANSI-like color parsing (hardcoded mappings for common codes)
  const formattedOutput = useMemo(() => {
    return output
      .split('\n')
      .flatMap((line, i) => {
        // Very naive color support for the "Diet" version
        let className = 'term-line';
        if (line.includes('[31m') || line.toLowerCase().includes('error'))
          className += ' term-error';
        else if (line.includes('[32m') || line.toLowerCase().includes('success'))
          className += ' term-success';
        else if (line.includes('[33m')) className += ' term-warn';

        const cleanLine = line.replace(/\[\d+m/g, '');
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: split guarantees stable order
          <div key={`term-line-${i}`} className={className}>
            <span className="term-num">{i + 1}</span>
            <span className="term-text">{cleanLine}</span>
          </div>
        );
      })
      .flat();
  }, [output]);

  return (
    <div className={`sovereign-terminal ${isExecuting ? 'executing' : ''}`}>
      <div className="terminal-header">
        <TerminalIcon size={12} className="icon-magenta" />
        <span className="terminal-title">SOVEREIGN_SHELL</span>
        {isExecuting && <span className="term-status-pulse">RUNNING</span>}
      </div>

      <div className="terminal-command-line">
        <ChevronRight size={14} className="icon-cyan" />
        <code className="term-command">{command}</code>
      </div>

      {output && (
        <div className="terminal-output-area" ref={outputRef}>
          {formattedOutput}
        </div>
      )}
    </div>
  );
}
