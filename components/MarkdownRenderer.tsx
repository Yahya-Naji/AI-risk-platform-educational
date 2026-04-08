'use client';

import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="md-render">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
