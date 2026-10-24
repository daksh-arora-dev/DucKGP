import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { ArrowUp, CornerDownLeft, Square, WandSparkles } from 'lucide-react';
import { DEMO_MODE } from '../lib/chatApi';

interface Props {
  onSend: (message: string) => void;
  onStop: () => void;
  busy: boolean;
  focusRef: RefObject<HTMLTextAreaElement | null>;
  suggestedText?: string;
  onSuggestionApplied?: () => void;
}

export default function Composer({ onSend, onStop, busy, focusRef, suggestedText, onSuggestionApplied }: Props) {
  const [value, setValue] = useState('');
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!suggestedText) return;
    setValue(suggestedText);
    onSuggestionApplied?.();
    focusRef.current?.focus();
  }, [suggestedText, onSuggestionApplied, focusRef]);

  useEffect(() => {
    if (!innerRef.current) return;
    innerRef.current.style.height = 'auto';
    innerRef.current.style.height = `${Math.min(innerRef.current.scrollHeight, 190)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !busy;
  function submit() {
    if (!canSend) return;
    onSend(value.trim());
    setValue('');
  }
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="composer-shell">
      <div className="composer">
        <div className="composer-topline"><span className="composer-sparkle"><WandSparkles size={14} /></span><span>ASK YOUR CAMPUS CO-PILOT</span><span className="composer-counter">{value.length > 0 ? `${value.length} characters` : 'READY WHEN YOU ARE'}</span></div>
        <textarea
          ref={(node) => { innerRef.current = node; focusRef.current = node; }}
          rows={1}
          value={value}
          maxLength={12000}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask anything about campus, classes, or a curious idea..."
          aria-label="Chat message"
        />
        <div className="composer-bottom">
          <div className="composer-hint"><CornerDownLeft size={13} /><span><strong>Enter</strong> to send · Shift + Enter for new line</span></div>
          {busy ? (
            <button className="send-button stop-button" onClick={onStop} title="Stop response" aria-label="Stop response"><Square size={16} fill="currentColor" /></button>
          ) : (
            <button className="send-button" disabled={!canSend} onClick={submit} title="Send message" aria-label="Send message"><ArrowUp size={20} strokeWidth={2.5} /></button>
          )}
        </div>
      </div>
      <div className="composer-footer"><span>MADE WITH <span className="heart">♥</span> FOR KGP</span><span>{DEMO_MODE ? 'DEMO REPLIES · NO LIVE AI' : 'AI RESPONSES MAY BE INACCURATE · VERIFY SOURCES'}</span></div>
    </div>
  );
}
