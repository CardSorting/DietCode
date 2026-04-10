/**
 * [LAYER: UI]
 * [SUB-ZONE: common]
 * Principle: Presentation layer - reusable UI components
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 */

import type { ReactNode } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface MarkdownBlockProps {
  markdown: string;
  children?: ReactNode;
}

export default function MarkdownBlock({ markdown, children }: MarkdownBlockProps) {
  return (
    <div className="markdown text-xs">
      <MarkdownRenderer markdown={markdown} />
    </div>
  );
}
