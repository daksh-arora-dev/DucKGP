import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { INTEGRATIONS, connectable, summarize, type ConnState, type IntegrationDef, type RingSummary } from './integrations';
import { toast } from './toast';
import { duck } from './duck';
import { sfx } from './audio';

interface Ctx {
  defs: IntegrationDef[];
  states: Record<string, ConnState>;
  summary: RingSummary;
  refresh: (id?: string) => Promise<void>;
  connect: (id: string) => Promise<void>;
  disconnect: (id: string) => Promise<void>;
}
const IntegrationsContext = createContext<Ctx | null>(null);

export function IntegrationsProvider({ children }: { children: ReactNode }) {
  const [states, setStates] = useState<Record<string, ConnState>>({});
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const patch = useCallback((id: string, s: ConnState) => { if (mounted.current) setStates((cur) => ({ ...cur, [id]: { ...cur[id], ...s } })); }, []);

  const refresh = useCallback(async (id?: string) => {
    const targets = id ? INTEGRATIONS.filter((d) => d.id === id) : connectable();
    await Promise.all(targets.map(async (d) => {
      if (!d.connection) return;
      patch(d.id, { status: 'checking', busy: false });
      try {
        const r = await d.connection.status();
        patch(d.id, { status: r.connected ? 'connected' : 'disconnected', label: r.label, error: undefined });
      } catch (e) {
        patch(d.id, { status: 'error', error: e instanceof Error ? e.message : 'Status check failed' });
      }
    }));
  }, [patch]);

  const connect = useCallback(async (id: string) => {
    const d = INTEGRATIONS.find((x) => x.id === id);
    if (!d?.connection) return;
    patch(id, { status: 'checking', busy: true });
    try { await d.connection.connect(); }
    catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not start connection';
      patch(id, { status: 'error', error: msg, busy: false });
      toast('error', `${d.name} connection failed`, msg); duck.error();
    }
  }, [patch]);

  const disconnect = useCallback(async (id: string) => {
    const d = INTEGRATIONS.find((x) => x.id === id);
    if (!d?.connection) return;
    const before = states[id];
    patch(id, { status: before?.status ?? 'connected', busy: true });
    try {
      await d.connection.disconnect();
      patch(id, { status: 'disconnected', label: undefined, error: undefined, busy: false });
      sfx('toggleOff'); toast('info', `${d.name} disconnected`, 'DucKGP can no longer read it.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not disconnect';
      patch(id, { ...before, status: before?.status ?? 'connected', error: msg, busy: false });
      toast('error', `Could not disconnect ${d.name}`, msg); duck.error();
    }
  }, [patch, states]);

  // Initial status + handle the ?gmail=… redirect the backend OAuth callback appends.
  useEffect(() => {
    const url = new URL(window.location.href);
    const flag = url.searchParams.get('gmail');
    if (flag) {
      url.searchParams.delete('gmail');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);
      if (flag === 'connected') { toast('success', 'Gmail connected'); duck.success(); }
      else toast('error', flag === 'expired' ? 'Gmail link expired' : 'Gmail connection was cancelled', 'Try connecting again from Settings → Integrations.');
    }
    void refresh();
  }, [refresh]);

  const summary = useMemo(() => summarize(INTEGRATIONS, states), [states]);
  const value = useMemo<Ctx>(() => ({ defs: INTEGRATIONS, states, summary, refresh, connect, disconnect }), [states, summary, refresh, connect, disconnect]);
  return <IntegrationsContext.Provider value={value}>{children}</IntegrationsContext.Provider>;
}

export function useIntegrations(): Ctx {
  const c = useContext(IntegrationsContext);
  if (!c) throw new Error('useIntegrations must be used inside IntegrationsProvider');
  return c;
}
