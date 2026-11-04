import { lazy, memo, Suspense, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Copy, ExternalLink, Library, Pencil, RefreshCw, RotateCcw, Trash2, Wrench } from 'lucide-react';
import type { ChatMessage as Msg } from '../lib/types';
import DuckMark from './DuckMark';
// Markdown pulls in KaTeX + highlight.js, so it is loaded on demand.
const Markdown = lazy(() => import('./Markdown'));
import { spring } from '../core/motion';

interface Props {
  message: Msg;
  readOnly?: boolean;
  isLastAssistant?: boolean;
  canDelete?: boolean;
  deleteHint?: string;
  onRegenerate?: () => void;
  onRetry?: () => void;
  onEdit?: (text: string) => void;
  onDelete?: () => void;
}

const COLLAPSE_AT = 520; // px

export default memo(function ChatMessage({ message, readOnly, isLastAssistant, canDelete, deleteHint, onRegenerate, onRetry, onEdit, onDelete }: Props) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [tall, setTall] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const isAssistant = message.role === 'assistant';

  useLayoutEffect(() => { if (bodyRef.current) setTall(bodyRef.current.scrollHeight > COLLAPSE_AT + 80); }, [message.content]);

  async function copy() {
    try { await navigator.clipboard.writeText(message.content); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  }
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.article layout="position" className={`msg ${isAssistant ? 'msg-ai' : 'msg-user'} ${message.error ? 'msg-error' : ''}`}
      initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring}>
      {isAssistant && <div className="msg-avatar" aria-hidden="true"><DuckMark size={30} /></div>}
      <div className="msg-main">
        <div className="msg-meta">{isAssistant ? 'DucKGP' : 'You'} · {time}</div>
        <div className="msg-bubble">
          <div ref={bodyRef} className={`msg-body ${tall && !expanded ? 'collapsed' : ''}`}>
            {isAssistant ? <Suspense fallback={<p className="user-text">{message.content}</p>}><Markdown>{message.content}</Markdown></Suspense> : <p className="user-text">{message.content}</p>}
          </div>
          {tall && <button type="button" className="expand-btn" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><ChevronDown size={14} className={expanded ? 'flip' : ''} />{expanded ? 'Show less' : 'Show more'}</button>}
        </div>

        {!!message.toolsUsed?.length && <div className="chips" aria-label="Tools used"><Wrench size={12} />{message.toolsUsed.map((t) => <span key={t} className="chip">{t}</span>)}</div>}
        {!!message.sources?.length && (
          <div className="sources">
            <button type="button" className="chip btn-chip" aria-expanded={showSources} onClick={() => setShowSources(!showSources)}><Library size={12} />{message.sources.length} source{message.sources.length > 1 ? 's' : ''}</button>
            <AnimatePresence initial={false}>
              {showSources && (
                <motion.ol initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring}>
                  {message.sources.map((s, i) => (
                    <li key={`${s.url}-${i}`}>{/^https?:\/\//i.test(s.url) ? <a href={s.url} target="_blank" rel="noopener noreferrer nofollow">{s.title}<ExternalLink size={11} /></a> : <span>{s.title}</span>}</li>
                  ))}
                </motion.ol>
              )}
            </AnimatePresence>
          </div>
        )}

        {!readOnly && (
          <div className="msg-actions" role="toolbar" aria-label="Message actions">
            <button type="button" onClick={() => { void copy(); }} aria-label="Copy message">{copied ? <Check size={14} /> : <Copy size={14} />}<span>{copied ? 'Copied' : 'Copy'}</span></button>
            {message.error && onRetry && <button type="button" onClick={onRetry}><RotateCcw size={14} /><span>Retry</span></button>}
            {isAssistant && !message.error && isLastAssistant && onRegenerate && <button type="button" onClick={onRegenerate} title="Asks again; the new answer is added below"><RefreshCw size={14} /><span>Ask again</span></button>}
            {!isAssistant && onEdit && <button type="button" onClick={() => onEdit(message.content)} title="Copies into the composer; it is sent as a new message"><Pencil size={14} /><span>Edit &amp; resend</span></button>}
            {onDelete && <button type="button" className="danger-hover" onClick={onDelete} disabled={!canDelete} title={canDelete ? 'Delete message' : deleteHint}><Trash2 size={14} /><span>Delete</span></button>}
          </div>
        )}
      </div>
    </motion.article>
  );
});
