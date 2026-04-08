import ReactMarkdown from 'react-markdown';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface MarkdownOutputProps {
  content: string;
}

interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

const CodeBlock = ({ inline, className, children, ...props }: CodeProps) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return <code className="inline-code" {...props}>{children}</code>;
  }

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-lang">{lang.toUpperCase() || 'CODE'}</span>
        <button type="button" className="copy-btn" onClick={handleCopy}>
          {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
        </button>
      </div>
      <pre className={`code-pre ${className}`} {...props}>
        <code>{children}</code>
      </pre>
    </div>
  );
};

export function MarkdownOutput({ content }: MarkdownOutputProps) {
  return (
    <div className="markdown-container">
      <ReactMarkdown
        components={{
          code: CodeBlock
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

