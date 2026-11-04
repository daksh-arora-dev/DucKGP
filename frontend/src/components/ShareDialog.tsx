import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import { Modal } from './ui';
import { createShare, listShares, revokeShare, shareUrl, type ShareRecord } from '../lib/sharing';
import { toast } from '../core/toast';

const EXPIRY = [{ v: 1, l: '1 day' }, { v: 7, l: '7 days' }, { v: 30, l: '30 days' }, { v: 0, l: 'Never' }];

export default function ShareDialog({ conversationId, title, onClose }: { conversationId: string | null; title: string; onClose: () => void }) {
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!conversationId) return;
    try { setShares(await listShares(conversationId)); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load links'); }
  }, [conversationId]);
  useEffect(() => { setLink(''); setConfirm(false); setError(''); setCopied(false); void load(); }, [conversationId, load]);

  async function create() {
    if (!conversationId) return;
    setBusy(true); setError('');
    try { setLink(shareUrl(await createShare(conversationId, days || null))); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not create link'); }
    finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); toast('success', 'Link copied'); window.setTimeout(() => setCopied(false), 1500); }
    catch { setError('Clipboard unavailable — select the link and copy it manually.'); }
  }
  async function revoke(id: string) {
    try { await revokeShare(id); toast('info', 'Link revoked', 'It no longer shows the conversation.'); await load(); }
    catch (e) { toast('error', 'Could not revoke', e instanceof Error ? e.message : undefined); }
  }
  const active = shares.filter((s) => !s.revoked_at && (!s.expires_at || Date.parse(s.expires_at) > Date.now()));

  return (
    <Modal open={!!conversationId} onClose={onClose} title="Share conversation">
      <div className="modal-body stack">
        <p className="muted">Creates a read-only link to a <strong>snapshot</strong> of “{title}” as it is now. Later messages are not included.</p>
        <div className="note warn"><ShieldAlert size={16} /><div>Anyone with the link can read this snapshot without signing in. It may contain personal details, including anything the assistant pulled from Gmail. Attachments, your email and account data are never included.</div></div>
        <label className="check"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} data-autofocus /> I understand this makes this conversation viewable by anyone with the link.</label>
        <div className="row gap wrap">
          <label className="field-inline">Expires<select value={days} onChange={(e) => setDays(Number(e.target.value))}>{EXPIRY.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></label>
          <button type="button" className="btn primary" disabled={!confirm || busy} onClick={() => { void create(); }}>{busy && <Loader2 className="spin" size={14} />} Create link</button>
        </div>
        {link && (
          <div className="link-box"><input readOnly value={link} aria-label="Share link" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className="btn ghost" onClick={() => { void copy(); }}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copied' : 'Copy'}</button></div>
        )}
        {link && <p className="muted small">Only a hash of the link is stored, so this is the only time it can be copied. Revoke and re-create it if you lose it.</p>}
        {error && <p className="error-text" role="alert">{error}</p>}
        <h3 className="group-title">Active links ({active.length})</h3>
        {active.length === 0 ? <p className="muted small">No active links for this conversation.</p> : (
          <ul className="share-list">{active.map((s) => (
            <li key={s.id}><span>Created {new Date(s.created_at).toLocaleString()} · {s.expires_at ? `expires ${new Date(s.expires_at).toLocaleDateString()}` : 'no expiry'}</span>
              <button type="button" className="btn ghost danger-text" onClick={() => { void revoke(s.id); }}><Trash2 size={14} /> Revoke</button></li>))}</ul>
        )}
      </div>
    </Modal>
  );
}
