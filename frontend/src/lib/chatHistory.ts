import { supabase } from './supabase';
import type { ChatMessage, Conversation } from './types';

interface StoredMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface StoredConversation {
  id: string;
  title: string;
  updated_at: string;
  messages: StoredMessage[];
}

/** Read the signed-in student's latest chats and messages. RLS enforces ownership. */
export async function loadCloudConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, updated_at, messages(id, role, content, created_at)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  const chats = (data ?? []) as StoredConversation[];

  return chats.map((chat) => {
    const messages: ChatMessage[] = (chat.messages ?? [])
      .map((message) => ({
        id: message.id,
        role: message.role as ChatMessage['role'],
        content: message.content,
        createdAt: Date.parse(message.created_at),
      }))
      .sort((a, b) => a.createdAt - b.createdAt);

    return {
      id: chat.id,
      title: chat.title,
      messages,
      updatedAt: Date.parse(chat.updated_at),
    };
  });
}

/** Delete only chats allowed by Supabase Row Level Security. */
export async function deleteCloudConversation(conversationId: string): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);

  if (error) throw new Error(error.message);
}
