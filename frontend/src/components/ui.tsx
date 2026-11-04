import { useEffect, useId, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { dismissToast, useToasts } from '../core/toast';
import { popIn, spring } from '../core/motion';
import { sfx } from '../core/audio';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Accessible modal: Escape, backdrop click, focus trap, focus restore, scroll lock on the app shell. */
export function Modal({ open, onClose, title, children, wide = false, className = '' }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    window.setTimeout(() => (node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>(FOCUSABLE))?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key !== 'Tab' || !node) return;
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('keydown', onKey, true); previous?.focus?.(); };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.section ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`modal-card ${wide ? 'is-wide' : ''} ${className}`}
            variants={popIn} initial="hidden" animate="show" exit="exit">
            <header className="modal-head">
              <h2 id={titleId}>{title}</h2>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
            </header>
            {children}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel, danger, onConfirm, onCancel }: {
  open: boolean; title: string; body: ReactNode; confirmLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="modal-body"><p className="muted">{body}</p></div>
      <footer className="modal-foot">
        <button type="button" className="btn ghost" onClick={onCancel} data-autofocus>Cancel</button>
        <button type="button" className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>{confirmLabel}</button>
      </footer>
    </Modal>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} data-sfx="none"
      className={`switch ${checked ? 'on' : ''}`} onClick={() => { sfx(checked ? 'toggleOff' : 'toggleOn'); onChange(!checked); }}>
      <motion.span className="switch-knob" layout transition={spring} />
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: Array<{ value: T; label: string; icon?: ReactNode }>; onChange: (v: T, e: React.MouseEvent) => void; label: string;
}) {
  const id = useId();
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'active' : ''} onClick={(e) => onChange(o.value, e)}>
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={spring} />}
          <span className="seg-label">{o.icon}{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Slider({ value, onChange, label, disabled }: { value: number; onChange: (v: number) => void; label: string; disabled?: boolean }) {
  return <input type="range" className="slider" min={0} max={100} value={Math.round(value * 100)} disabled={disabled} aria-label={label}
    style={{ ['--fill' as string]: `${value * 100}%` }} onChange={(e) => onChange(Number(e.target.value) / 100)} />;
}

export function Toasts() {
  const toasts = useToasts();
  return (
    <div className="toasts" role="region" aria-label="Notifications" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div key={t.id} layout className={`toast ${t.kind}`} initial={{ opacity: 0, y: 18, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }} transition={spring}>
            {t.kind === 'success' ? <CheckCircle2 size={18} /> : t.kind === 'error' ? <AlertTriangle size={18} /> : <Info size={18} />}
            <div><strong>{t.title}</strong>{t.detail && <p>{t.detail}</p>}</div>
            <button type="button" className="icon-btn sm" aria-label="Dismiss" onClick={() => dismissToast(t.id)}><X size={14} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
