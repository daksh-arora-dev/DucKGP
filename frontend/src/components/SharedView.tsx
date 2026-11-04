import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';
import { fetchShared, type SharedView as Shared } from '../lib/sharing';
import ChatMessage from './ChatMessage';
import Duck from './Duck';

/** Public, read-only snapshot. Renders only role/content/time — nothing else is returned by the RPC. */
export default function SharedView({ token }: { token: string }) {
  const [data, setData] = useState<Shared | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'gone' | 'error'>('loading');
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots'; meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    let off = false;
    fetchShared(token).then((d) => { if (off) return; setData(d); setState(d ? 'ok' : 'gone'); }).catch(() => { if (!off) setState('error'); });
    return () => { off = true; meta.remove(); };
  }, [token]);
  return (
    <div className="shared-page">
      <header className="shared-head"><Duck size={44} interactive={false} /><div><b>DucKGP</b><small><Lock size={11} /> Shared conversation · read-only</small></div></header>
      <main className="shared-main">
        {state === 'loading' && <p className="muted center">Loading…</p>}
        {state === 'gone' && <div className="center stack"><h2>This link isn’t available</h2><p className="muted">It may have expired or been revoked by its owner.</p></div>}
        {state === 'error' && <div className="center stack"><h2>Couldn’t load this conversation</h2><p className="muted">Check your connection and try again.</p></div>}
        {data && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="shared-title">{data.title}</h1>
            <p className="muted small">Snapshot from {new Date(data.created_at).toLocaleString()}{data.expires_at ? ` · expires ${new Date(data.expires_at).toLocaleDateString()}` : ''}</p>
            <div className="thread">{data.messages.map((m, i) => <ChatMessage key={i} readOnly message={{ id: String(i), role: m.role, content: m.content, createdAt: Date.parse(m.created_at) }} />)}</div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
