export type Role = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  toolsUsed?: string[];
  sources?: Array<{ title: string; url: string }>;
  error?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

export interface ChatReply {
  reply: string;
  toolsUsed?: string[];
  sources?: Array<{ title: string; url: string }>;
}
