import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Inbox, Link2, RefreshCw, Unplug } from 'lucide-react';
import { supabase } from '../lib/supabase';

const API = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

async function gmailRequest(path: string, method: 'GET' | 'POST' | 'DELETE' = 'GET') {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Please log in again.');

  const response = await fetch(`${API}/gmail/${path}`, {
    method,
    headers: { Authorization: `Bearer ${data.session.access_token}` },
  });
  if (!response.ok) {
    let detail = `Gmail service returned ${response.status}`;
    try { const body = await response.json(); if (body?.detail) detail = String(body.detail); } catch { /* Ignore non-JSON response. */ }
    throw new Error(detail);
  }
  return response.json();
}

export default function GmailConnect() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await gmailRequest('status');
      setEmail(typeof data.email === 'string' ? data.email : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Gmail status.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function connect() {
    setWorking(true);
    setError('');
    try {
      const { url } = await gmailRequest('connect', 'POST');
      if (typeof url !== 'string' || !url.startsWith('https://')) throw new Error('Google authorization URL is invalid.');
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect Gmail.');
      setWorking(false);
    }
  }

  async function disconnect() {
    if (!window.confirm('Disconnect Gmail from DucKGP?')) return;
    setWorking(true);
    setError('');
    try {
      await gmailRequest('disconnect', 'DELETE');
      setEmail(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not disconnect Gmail.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="gmail-connect-panel">
      {loading ? (
        <p className="gmail-status"><RefreshCw size={13}/> Checking your Gmail connection...</p>
      ) : email ? (
        <>
          <p className="gmail-status"><CheckCircle2 size={16}/> Connected: <strong>{email}</strong></p>
          <div className="gmail-connection-actions">
            <button type="button" className="ghost" onClick={() => { void refresh(); }} disabled={working}><RefreshCw size={15}/> Refresh</button>
            <button type="button" className="ghost" onClick={() => { void disconnect(); }} disabled={working}><Unplug size={15}/> Disconnect</button>
          </div>
          <p>Try asking DucKGP to summarize your unread emails.</p>
        </>
      ) : (
        <>
          <p className="gmail-status"><Inbox size={16}/> No Gmail account connected yet.</p>
          <div className="gmail-connection-actions">
            <button type="button" onClick={() => { void connect(); }} disabled={working}><Link2 size={16}/>{working ? 'Connecting...' : 'Connect Gmail'}</button>
            <button type="button" className="ghost" onClick={() => { void refresh(); }} disabled={working}><RefreshCw size={15}/> Retry</button>
          </div>
        </>
      )}
      {error && <p role="alert" className="auth-error">{error}</p>}
    </div>
  );
}
