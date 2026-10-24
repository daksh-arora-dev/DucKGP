import type { Conversation } from './types';

const KEY = 'duckgp-conversations-v1';

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(KEY);
    const value: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is Conversation =>
      Boolean(item && typeof item === 'object' && typeof item.id === 'string' && Array.isArray(item.messages)),
    );
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(conversations.slice(0, 50)));
  } catch {
    // Storage may be disabled or full. Chat still works in memory.
  }
}

export function createConversation(): Conversation {
  return { id: crypto.randomUUID(), title: 'New conversation', messages: [], updatedAt: Date.now() };
}

export function conversationTitle(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > 34 ? `${clean.slice(0, 34)}…` : clean || 'New conversation';
}
