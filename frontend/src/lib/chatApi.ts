import type { ChatMessage, ChatReply } from './types';
export const DEMO_MODE = false;
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const ENDPOINT = import.meta.env.VITE_CHAT_ENDPOINT || '/chat';

interface ApiResponse {
  reply?: string;
  response?: string;
  answer?: string;
  message?: string;
  tools_used?: string[];
  sources?: Array<{ title: string; url: string }>;
}

export async function sendChatMessage(
  message: string,
  conversationId: string,
  history: ChatMessage[],
  signal?: AbortSignal,
): Promise<ChatReply> {

  const response = await fetch(`${BASE_URL}${ENDPOINT.startsWith('/') ? ENDPOINT : `/${ENDPOINT}`}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      history: history.map(({ role, content }) => ({ role, content })),
    }),
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body.detail === 'string') detail = body.detail;
    } catch { /* Server did not return JSON. */ }
    throw new Error(`Chat server error: ${detail}`);
  }

  let body: ApiResponse;
  try {
    body = (await response.json()) as ApiResponse;
  } catch {
    throw new Error('The chat server returned an invalid JSON response.');
  }

  const reply = body.reply ?? body.response ?? body.answer ?? body.message;
  if (typeof reply !== 'string') {
    throw new Error('The chat server response must contain a string `reply` field.');
  }

  return { reply, toolsUsed: body.tools_used, sources: body.sources };
}
