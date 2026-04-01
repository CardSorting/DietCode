/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic for session and conversation state.
 * No external imports or I/O.
 */

export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  role: Role;
  content: string | any[];
  metrics?: {
    tokens?: number;
    latency_ms?: number;
  };
  reasoning?: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  agentId: string;
  title: string;
  messages: Message[];
  status: 'idle' | 'busy' | 'done' | 'failed' | 'error';
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SessionState {
  conversationId: string | null;
  messages: Message[];
  systemPrompt: string;
  metadata: Record<string, any>;
}

export const createInitialState = (systemPrompt: string): SessionState => ({
  conversationId: null,
  messages: [],
  systemPrompt,
  metadata: {},
});
