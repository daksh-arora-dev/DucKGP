import { useState } from 'react';
import { Check, Copy, ExternalLink, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage as ChatMessageType } from '../lib/types';
import DuckMark from './DuckMark';

export default function ChatMessage({ message }: { message: ChatMessageType }) {
  const [copied, setCopied] = useState(false);
  const isAssistant = message.role === 'assistant';

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* Clipboard access can be unavailable. */ }
  }

  return (
    <article className={`chat-message ${isAssistant ? 'message-assistant' : 'message-user'}`}>
      <div className={`message-avatar ${isAssistant ? 'assistant-avatar' : 'user-avatar'}`}>
        {isAssistant ? <DuckMark size={36} /> : <span>YOU</span>}
      </div>
      <div className="message-body">
        <div className="message-meta"><span>{isAssistant ? 'DucKGP' : 'You'}</span><span className="message-time">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{isAssistant && <span className="message-spark"><Sparkles size={12} /></span>}</div>
        <div className={`message-content ${message.error ? 'message-error' : ''}`}>
          {isAssistant ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
              a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}<ExternalLink size={12} /></a>,
              code: ({ className, children, ...props }) => <code className={className} {...props}>{children}</code>,
            }}>{message.content}</ReactMarkdown>
          ) : <p>{message.content}</p>}
        </div>
        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="tool-pills">{message.toolsUsed.map((tool) => <span key={tool}>✳ {tool}</span>)}</div>
        )}
        {message.sources && message.sources.length > 0 && (
          <div className="message-sources">{message.sources.map((source, idx) => <a href={source.url} key={`${source.url}-${idx}`} target="_blank" rel="noopener noreferrer">{source.title}<ExternalLink size={12} /></a>)}</div>
        )}
        {isAssistant && <div className="message-actions"><button onClick={copy} title="Copy response" aria-label="Copy response">{copied ? <Check size={14} /> : <Copy size={14} />}<span>{copied ? 'Copied!' : 'Copy'}</span></button></div>}
      </div>
    </article>
  );
}
