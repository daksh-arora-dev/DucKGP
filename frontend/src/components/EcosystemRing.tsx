import { useEffect, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { CheckCircle2, Link2, Loader2 } from 'lucide-react';
import { connectable, planned, type ConnState, type IntegrationDef } from '../core/integrations';
import { useIntegrations } from '../core/IntegrationsProvider';
import { useMotionScale, spring } from '../core/motion';

const R = 92, C = 2 * Math.PI * R, GAP = 0.035;

/** Pure arc layout (exported for tests). Handles total=0 without dividing by zero. */
export function arcLayout(total: number, gap = GAP): Array<{ start: number; end: number }> {
  if (total <= 0) return [];
  const slot = 1 / total;
  const g = total === 1 ? 0 : Math.min(gap, slot / 3);
  return Array.from({ length: total }, (_, i) => ({ start: i * slot + g / 2, end: (i + 1) * slot - g / 2 }));
}

const statusColor = (s?: ConnState) => (s?.status === 'connected' ? 'var(--accent)' : s?.status === 'error' ? 'var(--danger)' : 'var(--ring-idle)');

export default function EcosystemRing({ compact = false, onOpenIntegration }: { compact?: boolean; onOpenIntegration?: (id: string) => void }) {
  const { defs, states, summary, connect, disconnect } = useIntegrations();
  const scale = useMotionScale();
  const list: IntegrationDef[] = connectable(defs);
  const arcs = arcLayout(list.length);
  const [selected, setSelected] = useState<string | null>(null);
  const sel = list.find((d) => d.id === selected) ?? null;
  const pct = useMotionValue(0);
  const shown = useTransform(pct, (v) => Math.round(v * 100));
  const [label, setLabel] = useState('0');
  useEffect(() => {
    const c = animate(pct, summary.fraction, scale === 0 ? { duration: 0 } : { type: 'spring', stiffness: 90, damping: 18 });
    const u = shown.on('change', (v) => setLabel(String(v)));
    return () => { c.stop(); u(); };
  }, [summary.fraction, scale, pct, shown]);

  const size = compact ? 150 : 240;
  const plannedCount = planned(defs).length;
  return (
    <div className={`eco ${compact ? 'compact' : ''}`}>
      <div className="eco-ring" style={{ width: size, height: size }}>
        <svg viewBox="0 0 220 220" role="img" aria-label={`${summary.connected} of ${summary.total} available integrations connected`}>
          <circle cx="110" cy="110" r="106" className="eco-planned" strokeDasharray="1.5 7" />
          {list.length === 0 && <circle cx="110" cy="110" r={R} className="eco-track" />}
          {list.map((d, i) => {
            const a = arcs[i];
            const on = states[d.id]?.status === 'connected';
            const len = (a.end - a.start) * C;
            const rot = -90 + a.start * 360;
            return (
              <g key={d.id} transform={`rotate(${rot} 110 110)`}>
                <circle cx="110" cy="110" r={R} className="eco-track" strokeDasharray={`${len} ${C}`} />
                <motion.circle cx="110" cy="110" r={R} className="eco-seg" tabIndex={0} role="button" aria-label={`${d.name}: ${states[d.id]?.status ?? 'unknown'}`}
                  stroke={statusColor(states[d.id])} strokeDasharray={`${len} ${C}`} initial={{ strokeDashoffset: len }}
                  animate={{ strokeDashoffset: on ? 0 : len * 0.985, strokeWidth: selected === d.id ? 20 : 14, opacity: on || selected === d.id ? 1 : 0.55 }}
                  transition={scale === 0 ? { duration: 0 } : spring} whileHover={scale ? { strokeWidth: 19 } : undefined}
                  onClick={() => setSelected(selected === d.id ? null : d.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(selected === d.id ? null : d.id); } }} />
              </g>
            );
          })}
        </svg>
        <div className="eco-center">
          {summary.total === 0 ? <span className="eco-num">–</span> : <span className="eco-num">{label}<small>%</small></span>}
          <span className="eco-sub">{summary.total === 0 ? 'nothing to connect yet' : `${summary.connected} of ${summary.total} connected`}</span>
        </div>
      </div>
      {!compact && (
        <div className="eco-detail">
          <p className="eco-legend">
            <strong>{summary.connected}</strong> connected · <strong>{summary.total - summary.connected}</strong> available · <span title="Not implemented yet; not counted">{plannedCount} planned</span>
          </p>
          {sel ? (() => {
            const st = states[sel.id];
            const Icon = sel.icon;
            return (
              <motion.div key={sel.id} className="eco-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
                <div className="eco-card-head"><Icon size={18} /><strong>{sel.name}</strong>
                  <span className={`pill ${st?.status ?? 'unknown'}`}>{st?.status === 'connected' ? 'Connected' : st?.status === 'checking' ? 'Checking…' : st?.status === 'error' ? 'Status unavailable' : 'Not connected'}</span></div>
                <p className="muted">{st?.status === 'connected' && st.label ? `Signed in as ${st.label}` : sel.description}</p>
                {st?.error && <p className="error-text" role="alert">{st.error}</p>}
                <div className="row gap">
                  {st?.status === 'connected'
                    ? <button type="button" className="btn ghost" disabled={st.busy} onClick={() => { void disconnect(sel.id); }}>{st.busy ? <Loader2 className="spin" size={15} /> : null} Disconnect</button>
                    : <button type="button" className="btn primary" disabled={st?.busy || st?.status === 'checking'} onClick={() => { void connect(sel.id); }}>{st?.busy ? <Loader2 className="spin" size={15} /> : <Link2 size={15} />} Connect</button>}
                  {onOpenIntegration && <button type="button" className="btn ghost" onClick={() => onOpenIntegration(sel.id)}>Details</button>}
                </div>
              </motion.div>
            );
          })() : (
            <ul className="eco-list">
              {list.map((d) => (
                <li key={d.id}><button type="button" onClick={() => setSelected(d.id)}>
                  {states[d.id]?.status === 'connected' ? <CheckCircle2 size={15} className="ok" /> : <span className="dot" />}{d.name}
                </button></li>
              ))}
              {list.length === 0 && <li className="muted">No user-connectable integrations are registered.</li>}
            </ul>
          )}
          <p className="eco-note muted">Built-in public tools (IQPS, MetaKGP) work without connecting and aren’t counted.</p>
        </div>
      )}
    </div>
  );
}
