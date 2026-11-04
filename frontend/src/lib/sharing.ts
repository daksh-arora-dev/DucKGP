import { supabase } from './supabase';
import { isMissingObject } from './chatHistory';

export interface ShareRecord { id: string; conversation_id: string; title: string; created_at: string; expires_at: string | null; revoked_at: string | null }
export interface SharedView { title: string; created_at: string; expires_at: string | null; messages: Array<{ role: 'user' | 'assistant'; content: string; created_at: string }> }

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** 256-bit URL-safe random secret. Only its SHA-256 hash is ever stored server-side. */
export function generateShareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export async function hashToken(token: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
}
export const shareUrl = (token: string) => `${window.location.origin}${window.location.pathname}#/share/${token}`;
export function tokenFromHash(hash: string): string | null {
  const m = /^#\/share\/([A-Za-z0-9_-]{20,64})$/.exec(hash);
  return m ? m[1] : null;
}

export async function sharingAvailable(): Promise<boolean> {
  const { error } = await supabase.from('shared_conversations').select('id').limit(1);
  return !error || !isMissingObject(error);
}

export async function createShare(conversationId: string, expiresInDays: number | null): Promise<string> {
  const token = generateShareToken();
  const expires = expiresInDays ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString() : null;
  const { error } = await supabase.rpc('create_shared_conversation', {
    p_conversation_id: conversationId, p_token_hash: await hashToken(token), p_expires_at: expires,
  });
  if (error) throw new Error(isMissingObject(error) ? 'Sharing needs migration 03 on your Supabase project.' : error.message);
  return token;
}

export async function listShares(conversationId?: string): Promise<ShareRecord[]> {
  let q = supabase.from('shared_conversations').select('id, conversation_id, title, created_at, expires_at, revoked_at').order('created_at', { ascending: false });
  if (conversationId) q = q.eq('conversation_id', conversationId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as ShareRecord[];
}

export async function revokeShare(id: string): Promise<void> {
  const { data, error } = await supabase.from('shared_conversations').update({ revoked_at: new Date().toISOString() }).eq('id', id).select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('Could not revoke this link.');
}

export async function fetchShared(token: string): Promise<SharedView | null> {
  const { data, error } = await supabase.rpc('get_shared_conversation', { p_token_hash: await hashToken(token) });
  if (error) throw new Error(error.message);
  return (data as SharedView | null) ?? null;
}
