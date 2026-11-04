import { supabase } from './supabase';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

/** Authenticated request to the FastAPI backend with consistent error messages. */
export async function apiRequest<T = unknown>(path: string, method: 'GET' | 'POST' | 'DELETE' = 'GET'): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Please log in again.');
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { method, headers: { Authorization: `Bearer ${data.session.access_token}` } });
  } catch {
    throw new Error(method === 'DELETE'
      ? 'Request blocked or backend unreachable. If the backend is running, apply backend_patches (CORS must allow DELETE).'
      : 'Could not reach the DucKGP backend.');
  }
  if (!response.ok) {
    let detail = `Backend returned ${response.status}`;
    try { const body = await response.json(); if (body?.detail) detail = String(body.detail); } catch { /* non-JSON */ }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}
