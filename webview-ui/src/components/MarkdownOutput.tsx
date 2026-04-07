/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import ReactMarkdown from 'react-markdown';

interface MarkdownOutputProps {
  content: string;
}

export function MarkdownOutput({ content }: MarkdownOutputProps) {
  return (
    <div className="markdown-container">
      <ReactMarkdown>
        {content}
      </ReactMarkdown>
    </div>
  );
}
