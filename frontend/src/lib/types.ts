export type Role = 'user' | 'assistant';

export interface SourceRef { title: string; url: string }

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  toolsUsed?: string[];
  sources?: SourceRef[];
  error?: boolean;
  /** True while the message only exists in this browser (not yet reconciled with Supabase). */
  local?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
  /** Epoch ms when pinned. Requires migration 02; undefined otherwise. */
  pinnedAt?: number | null;
  /** Epoch ms when archived. Requires migration 02; undefined otherwise. */
  archivedAt?: number | null;
}

export interface ChatReply {
  reply: string;
  toolsUsed?: string[];
  sources?: SourceRef[];
}

/** Features that depend on optional database migrations / backend patches. */
export interface Capabilities {
  organize: boolean; // pinned_at / archived_at columns exist
  sharing: boolean; // shared_conversations + RPCs exist
  messageDelete: boolean | 'unknown'; // DELETE policy on messages
}
