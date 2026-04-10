/**
 * [LAYER: UI]
 * [SUB-ZONE: common]
 * Principle: Presentation layer - reusable UI components
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 */

interface LightMarkdownProps {
  compact?: boolean;
  text?: string;
}

function LightMarkdown({ compact = false, text = "" }: LightMarkdownProps) {
  // Simple markdown-like rendering
  const render = () => {
    const lines = text.split('\n');
    return (
      <div className="text-sm">
        {lines.map((line, i) => (
          <div key={i} className={`markdown ${compact ? 'line-clamp-2' : ''}`}>
            {line}
          </div>
        ))}
      </div>
    );
  };
  
  return render();
}

export default LightMarkdown;
