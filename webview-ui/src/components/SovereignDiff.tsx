/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export function SovereignDiff({ content }: { content: string }) {
  try {
    const data = JSON.parse(content);
    
    // Detect standard orchestrator payload structure for tool modifications
    if (data.targetContent !== undefined && data.replacementContent !== undefined) {
      let targetLines = data.targetContent.split('\n');
      let replaceLines = data.replacementContent.split('\n');
      
      // Cleanup edge case formatting
      if (data.targetContent === '') targetLines = [];
      if (data.replacementContent === '') replaceLines = [];
      
      return (
        <div className="sovereign-diff-container">
          {data.targetFile && <div className="diff-file-tag">{data.targetFile}</div>}
          <div className="sovereign-diff-block">
            {targetLines.map((line: string, i: number) => (
              <div key={`del-${i}`} className="diff-line diff-delete">
                <span className="diff-marker">-</span><span className="diff-code">{line}</span>
              </div>
            ))}
            {replaceLines.map((line: string, i: number) => (
              <div key={`add-${i}`} className="diff-line diff-add">
                <span className="diff-marker">+</span><span className="diff-code">{line}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return <pre className="action-content">{content}</pre>;
  } catch (e) {
    // If not JSON or unstructured payload, fallback completely transparently to the original display
    return <pre className="action-content">{content}</pre>;
  }
}
