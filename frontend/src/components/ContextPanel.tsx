import { useMemo } from 'react';
import { ExternalLink, Wrench, X } from 'lucide-react';
import type { Conversation } from '../lib/types';
import EcosystemRing from './EcosystemRing';

export default function ContextPanel({ conversation, api, onClose, onOpenIntegrations }: {
  conversation?: Conversation; api: 'checking' | 'online' | 'offline'; onClose: () => void; onOpenIntegrations: () => void;
}) {
  const info = useMemo(() => {
    const msgs = conversation?.messages ?? [];
    const tools = new Map<string, number>();
    const sources = new Map<string, string>();
    msgs.forEach((m) => { m.toolsUsed?.forEach((t) => tools.set(t, (tools.get(t) ?? 0) + 1)); m.sources?.forEach((s) => sources.set(s.url, s.title)); });
    return { count: msgs.length, tools: [...tools], sources: [...sources] };
  }, [conversation]);
  return (
    <aside className="context-panel" aria-label="Conversation context">
      <header><h3>Context</h3><button type="button" className="icon-btn" onClick={onClose} aria-label="Close context panel"><X size={16} /></button></header>
      <section><h4>This chat</h4><p className="muted">{info.count} message{info.count === 1 ? '' : 's'}{conversation?.title && info.count ? ` · “${conversation.title}”` : ''}</p></section>
      <section><h4><Wrench size={12} /> Tools used</h4>
        {info.tools.length ? <div className="chips">{info.tools.map(([t, n]) => <span key={t} className="chip">{t}{n > 1 ? ` ×${n}` : ''}</span>)}</div>
          : <p className="muted small">None reported. The backend only reports tool use when the optional tools patch is installed.</p>}</section>
      <section><h4>Sources</h4>
        {info.sources.length ? <ul className="src-list">{info.sources.map(([url, title]) => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer nofollow">{title}<ExternalLink size={11} /></a></li>)}</ul>
          : <p className="muted small">No sources attached to this chat.</p>}</section>
      <section><h4>Backend</h4><p className={`status-line ${api}`}><i />{api === 'online' ? 'FastAPI online' : api === 'checking' ? 'Checking…' : 'FastAPI unreachable'}</p></section>
      <section><h4>Ecosystem</h4><EcosystemRing compact /><button type="button" className="btn ghost wide" onClick={onOpenIntegrations}>Manage integrations</button></section>
    </aside>
  );
}
