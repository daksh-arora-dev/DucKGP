import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, Square } from 'lucide-react';
import { spring, springBouncy } from '../core/motion';
import { MAX_MESSAGE } from '../lib/useChat';

interface Props {
  conversationId: string;
  onSend: (message: string) => void;
  onStop: () => void;
  busy: boolean;
  disabled?: boolean;
  focusRef: RefObject<HTMLTextAreaElement | null>;
  injected?: { text: string; nonce: number } | null;
}

const drafts = new Map<string, string>(); // typed-but-unsent text survives switching chats

export default function Composer({ conversationId, onSend, onStop, busy, disabled, focusRef, injected }: Props) {
  const [value, setValue] = useState(drafts.get(conversationId) ?? '');
  const inner = useRef<HTMLTextAreaElement | null>(null);
  const lastNonce = useRef(0);

  useEffect(() => { setValue(drafts.get(conversationId) ?? ''); }, [conversationId]);
  useEffect(() => {
    if (!injected || injected.nonce === lastNonce.current) return;
    lastNonce.current = injected.nonce;
    setValue(injected.text);
    window.setTimeout(() => { inner.current?.focus(); inner.current?.setSelectionRange(injected.text.length, injected.text.length); }, 20);
  }, [injected]);
  useEffect(() => {
    const el = inner.current; if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const over = value.length > MAX_MESSAGE;
  const canSend = value.trim().length > 0 && !busy && !disabled && !over;
  function update(v: string) { setValue(v); if (v) drafts.set(conversationId, v); else drafts.delete(conversationId); }
  function submit() { if (!canSend) return; onSend(value.trim()); update(''); }
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
    if (e.key === 'Escape' && busy) onStop();
  }

  return (
    <div className="composer-dock">
      <motion.div className={`composer ${busy ? 'is-busy' : ''}`} layout transition={spring}>
        <textarea ref={(n) => { inner.current = n; focusRef.current = n; }} rows={1} value={value} onChange={(e) => update(e.target.value)} onKeyDown={onKeyDown}
          placeholder="Ask me anything, KGPian…" aria-label="Message DucKGP" enterKeyHint="send" />
        <div className="composer-row">
          <span className="composer-hint"><kbd>Enter</kbd> send · <kbd>Shift</kbd>+<kbd>Enter</kbd> newline{busy && <> · <kbd>Esc</kbd> stop</>}</span>
          {value.length > MAX_MESSAGE * 0.8 && <span className={`counter ${over ? 'over' : ''}`}>{value.length}/{MAX_MESSAGE}</span>}
          <AnimatePresence mode="wait" initial={false}>
            {busy ? (
              <motion.button key="stop" type="button" className="send stop" onClick={onStop} aria-label="Stop waiting for the response" title="Stop waiting (the server may still finish)"
                initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={springBouncy} whileTap={{ scale: 0.9 }}><Square size={14} fill="currentColor" /></motion.button>
            ) : (
              <motion.button key="send" type="button" className="send" disabled={!canSend} onClick={submit} aria-label="Send message" title={over ? `Messages are limited to ${MAX_MESSAGE} characters` : 'Send'}
                initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={springBouncy} whileHover={canSend ? { scale: 1.08 } : undefined} whileTap={canSend ? { scale: 0.88, rotate: -8 } : undefined}><ArrowUp size={18} strokeWidth={2.6} /></motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      <p className="composer-foot">DucKGP can make mistakes. Check important information.</p>
    </div>
  );
}
