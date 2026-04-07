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
