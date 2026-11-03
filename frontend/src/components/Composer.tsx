import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { ArrowUp, CornerDownLeft, Square, Sparkles } from 'lucide-react';

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
        <textarea
          ref={(node) => { innerRef.current = node; focusRef.current = node; }}
          rows={1}
          value={value}
          maxLength={12000}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask me anything, KGPian..."
          aria-label="Message DucKGP"
        />
        <div className="composer-bottom">
          <span className="composer-hint"><Sparkles size={15}/><span>Made for curious minds</span></span>
          <span className="composer-key-hint"><CornerDownLeft size={12}/> Enter to send</span>
          {busy ? (
            <button type="button" className="send-button stop-button" onClick={onStop} title="Stop response" aria-label="Stop response"><Square size={15} fill="currentColor"/></button>
          ) : (
            <button type="button" className="send-button" disabled={!canSend} onClick={submit} title="Send message" aria-label="Send message"><ArrowUp size={19} strokeWidth={2.6}/></button>
          )}
        </div>
      </div>
      <p className="composer-footer">DucKGP may make mistakes. Verify important information.</p>
    </div>
  );
}
