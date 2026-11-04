import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { CornerDownLeft, Search } from 'lucide-react';
import { Modal } from './ui';

export interface Command { id: string; label: string; hint?: string; icon?: ReactNode; group: string; keywords?: string; run: () => void }

export default function CommandPalette({ open, onClose, commands }: { open: boolean; onClose: () => void; commands: Command[] }) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => { if (open) { setQ(''); setIdx(0); } }, [open]);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return commands.slice(0, 40);
    return commands.filter((c) => `${c.label} ${c.group} ${c.keywords ?? ''}`.toLowerCase().includes(s)).slice(0, 40);
  }, [q, commands]);
  useEffect(() => { setIdx(0); }, [q]);
  useEffect(() => { listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }, [idx]);

  const run = (c?: Command) => { if (!c) return; onClose(); window.setTimeout(c.run, 60); };
  return (
    <Modal open={open} onClose={onClose} title="Command palette" className="palette">
      <div className="palette-input"><Search size={17} />
        <input data-autofocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats, actions, settings…" aria-label="Search commands" role="combobox" aria-expanded="true" aria-controls="palette-list"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(results.length - 1, i + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
            if (e.key === 'Enter') { e.preventDefault(); run(results[idx]); }
          }} /></div>
      <ul id="palette-list" ref={listRef} role="listbox" className="palette-list">
        {results.length === 0 && <li className="empty">Nothing matches “{q}”.</li>}
        {results.map((c, i) => {
          const showGroup = i === 0 || results[i - 1].group !== c.group;
          return (
            <li key={c.id} role="presentation">
              {showGroup && <div className="palette-group">{c.group}</div>}
              <button type="button" role="option" aria-selected={i === idx} className={i === idx ? 'sel' : ''} onMouseMove={() => setIdx(i)} onClick={() => run(c)}>
                {i === idx && <motion.span layoutId="palette-sel" className="sel-bg" transition={{ type: 'spring', stiffness: 600, damping: 40 }} />}
                <span className="row-in">{c.icon}<span>{c.label}</span>{c.hint && <kbd>{c.hint}</kbd>}{i === idx && <CornerDownLeft size={13} className="enter" />}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
