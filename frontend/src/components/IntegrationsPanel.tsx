import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Loader2, Lock, MessageSquarePlus, RefreshCw } from 'lucide-react';
import { CATEGORIES, type IntegrationDef } from '../core/integrations';
import { useIntegrations } from '../core/IntegrationsProvider';
import { spring } from '../core/motion';
import EcosystemRing from './EcosystemRing';

interface Props { onPrompt: (prompt: string) => void; onView: (v: 'library') => void; focusId?: string | null }

const KIND_LABEL = { account: 'Your account', 'public-tool': 'Built-in tool', workspace: 'Built in' } as const;

export default function IntegrationsPanel({ onPrompt, onView, focusId }: Props) {
  const { defs, states, connect, disconnect, refresh } = useIntegrations();
  const [open, setOpen] = useState<string | null>(focusId ?? null);

  const card = (d: IntegrationDef) => {
    const st = states[d.id];
    const Icon = d.icon;
    const planned = d.availability === 'planned';
    const connected = st?.status === 'connected';
    const isOpen = open === d.id;
    const badge = planned ? ['planned', 'Planned'] : d.kind === 'account'
      ? connected ? ['connected', 'Connected'] : st?.status === 'checking' ? ['checking', 'Checking…'] : st?.status === 'error' ? ['error', 'Status unavailable'] : ['disconnected', 'Not connected']
      : ['builtin', KIND_LABEL[d.kind]];
    return (
      <motion.div key={d.id} layout transition={spring} className={`int-card ${planned ? 'is-planned' : ''}`}>
        <button type="button" className="int-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : d.id)}>
          <span className="int-icon"><Icon size={18} /></span>
          <span className="int-title"><strong>{d.name}</strong><small>{d.description}</small></span>
          <span className={`pill ${badge[0]}`}>{badge[1]}</span>
          <ChevronDown size={16} className={`chev ${isOpen ? 'open' : ''}`} />
        </button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div className="int-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring}>
              <div className="int-body-inner">
                {d.note && <p className="note">{d.note}</p>}
                {st?.error && <p className="error-text" role="alert">{st.error}</p>}
                {connected && st?.label && <p className="muted">Connected as <strong>{st.label}</strong></p>}
                {d.tools && <p className="meta"><b>Tools</b> {d.tools.map((t) => <code key={t}>{t}</code>)}</p>}
                {d.permissions && <div className="meta"><b><Lock size={12} /> Permissions</b><ul>{d.permissions.map((p) => <li key={p}>{p}</li>)}</ul></div>}
                {d.setup && !connected && <div className="meta"><b>Setup</b><ul>{d.setup.map((p) => <li key={p}>{p}</li>)}</ul></div>}
                {planned ? <p className="muted">Not implemented yet — there is no backend tool for this, so nothing here is operational.</p> : (
                  <div className="row gap wrap">
                    {d.connection && (connected
                      ? <button type="button" className="btn ghost" disabled={st?.busy} onClick={() => { void disconnect(d.id); }}>{st?.busy && <Loader2 className="spin" size={14} />} Disconnect</button>
                      : <button type="button" className="btn primary" disabled={st?.busy || st?.status === 'checking'} onClick={() => { void connect(d.id); }}>{st?.busy && <Loader2 className="spin" size={14} />} Connect {d.name}</button>)}
                    {d.connection && <button type="button" className="btn ghost" onClick={() => { void refresh(d.id); }}><RefreshCw size={14} /> Recheck</button>}
                    {d.actions.map((a) => {
                      const blocked = a.needsConnection && !connected;
                      return (
                        <button key={a.id} type="button" className="btn ghost" disabled={blocked} title={blocked ? `Connect ${d.name} first` : undefined}
                          onClick={() => { if (a.view) onView(a.view); else if (a.prompt) onPrompt(a.prompt); }}>
                          <MessageSquarePlus size={14} /> {a.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="integrations">
      <EcosystemRing onOpenIntegration={(id) => setOpen(id)} />
      {CATEGORIES.map((cat) => {
        const items = defs.filter((d) => d.category === cat);
        if (!items.length) return null;
        return <section key={cat}><h3 className="group-title">{cat}</h3><div className="int-list">{items.map(card)}</div></section>;
      })}
    </div>
  );
}
