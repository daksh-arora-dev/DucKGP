import { supabase } from './supabase';
import type { Capabilities, ChatMessage, Conversation, SourceRef } from './types';

interface StoredMessage { id: string; role: string; content: string; created_at: string; metadata?: { tools_used?: unknown; sources?: unknown } | null }
interface StoredConversation {
  id: string; title: string; updated_at: string; messages: StoredMessage[];
  pinned_at?: string | null; archived_at?: string | null;
}

const MESSAGE_COLS = 'id, role, content, created_at, metadata';

function toMessage(m: StoredMessage): ChatMessage {
  const tools = Array.isArray(m.metadata?.tools_used) ? (m.metadata!.tools_used as unknown[]).filter((t): t is string => typeof t === 'string') : undefined;
  const sources = Array.isArray(m.metadata?.sources)
    ? (m.metadata!.sources as unknown[]).filter((s): s is SourceRef => !!s && typeof (s as SourceRef).url === 'string' && typeof (s as SourceRef).title === 'string')
    : undefined;
  return {
    id: m.id, role: m.role as ChatMessage['role'], content: m.content, createdAt: Date.parse(m.created_at),
    toolsUsed: tools?.length ? tools : undefined, sources: sources?.length ? sources : undefined,
  };
}

function toConversation(c: StoredConversation): Conversation {
  return {
    id: c.id, title: c.title, updatedAt: Date.parse(c.updated_at),
    messages: (c.messages ?? []).map(toMessage).sort((a, b) => a.createdAt - b.createdAt),
    pinnedAt: c.pinned_at ? Date.parse(c.pinned_at) : c.pinned_at === null ? null : undefined,
    archivedAt: c.archived_at ? Date.parse(c.archived_at) : c.archived_at === null ? null : undefined,
  };
}

const isMissingObject = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42703' || e.code === '42P01' || e.code === 'PGRST202' || e.code === 'PGRST204' || e.code === 'PGRST205' ||
    /pinned_at|archived_at|shared_conversations|does not exist|schema cache/i.test(e.message ?? ''));
export { isMissingObject };

/** Read the signed-in student's chats. RLS enforces ownership. Falls back if migration 02 is not installed. */
export async function loadCloudConversations(userId: string): Promise<{ conversations: Conversation[]; organize: boolean }> {
  const base = `id, title, updated_at, messages(${MESSAGE_COLS})`;
  let organize = true;
  type Res = { data: unknown; error: { code?: string; message: string } | null };
  let res: Res = await supabase.from('conversations').select(`${base}, pinned_at, archived_at`).eq('user_id', userId).order('updated_at', { ascending: false }).limit(200);
  if (res.error && isMissingObject(res.error)) {
    organize = false;
    res = await supabase.from('conversations').select(base).eq('user_id', userId).order('updated_at', { ascending: false }).limit(200);
  }
  if (res.error) throw new Error(res.error.message);
  return { conversations: ((res.data ?? []) as StoredConversation[]).map(toConversation), organize };
}

export async function loadConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase.from('messages').select(MESSAGE_COLS).eq('conversation_id', conversationId).order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as StoredMessage[]).map(toMessage);
}

export async function deleteCloudConversation(conversationId: string): Promise<void> {
  const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
  if (error) throw new Error(error.message);
}

export async function renameCloudConversation(id: string, title: string): Promise<void> {
  const { data, error } = await supabase.from('conversations').update({ title }).eq('id', id).select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('Rename was not saved (conversation not found).');
}

export async function setConversationFlag(id: string, flag: 'pinned_at' | 'archived_at', on: boolean): Promise<number | null> {
  const value = on ? new Date().toISOString() : null;
  const { data, error } = await supabase.from('conversations').update({ [flag]: value }).eq('id', id).select('id');
  if (error) throw new Error(isMissingObject(error) ? 'Run migration 02 (organize chats) to enable this.' : error.message);
  if (!data?.length) throw new Error('Change was not saved.');
  return value ? Date.parse(value) : null;
}

/** Needs the optional DELETE policy from migration 02. RLS silently filters, so we verify rows. */
export async function deleteCloudMessage(id: string): Promise<boolean> {
  const { data, error } = await supabase.from('messages').delete().eq('id', id).select('id');
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

export type { Capabilities };
