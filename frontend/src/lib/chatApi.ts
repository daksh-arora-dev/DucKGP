import type { ChatMessage, ChatReply } from './types';
import { supabase } from './supabase';
import { API_BASE } from './api';

const ENDPOINT = import.meta.env.VITE_CHAT_ENDPOINT || '/chat';

interface ApiResponse {
  reply?: string; response?: string; answer?: string; message?: string;
  tools_used?: string[]; sources?: Array<{ title: string; url: string }>;
}

/**
 * POST /chat. The backend returns one JSON body (no streaming) and persists both messages itself.
 * Aborting only stops the browser from waiting; the server may still finish and save the reply.
 */
export async function sendChatMessage(message: string, conversationId: string, history: ChatMessage[], signal?: AbortSignal): Promise<ChatReply> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Please log in to continue.');

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${ENDPOINT.startsWith('/') ? ENDPOINT : `/${ENDPOINT}`}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
      signal,
      body: JSON.stringify({ message, conversation_id: conversationId, history: history.map(({ role, content }) => ({ role, content })) }),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new Error('Could not reach the DucKGP backend. Is it running?');
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body.detail === 'string') detail = body.detail;
      else if (Array.isArray(body.detail) && body.detail[0]?.msg) detail = String(body.detail[0].msg);
    } catch { /* not JSON */ }
    throw new Error(`Chat server error: ${detail}`);
  }

  let body: ApiResponse;
  try { body = (await response.json()) as ApiResponse; } catch { throw new Error('The chat server returned an invalid JSON response.'); }
  const reply = body.reply ?? body.response ?? body.answer ?? body.message;
  if (typeof reply !== 'string') throw new Error('The chat server response must contain a string `reply` field.');
  return { reply, toolsUsed: body.tools_used, sources: body.sources };
}
