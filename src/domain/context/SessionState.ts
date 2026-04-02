/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic for session and conversation state.
 * No external imports or I/O.
 */

import type { Reasoning } from '../memory/Reasoning';

export type Role = 'user' | 'assistant' | 'system';

export type MessageBlock = 
  | { type: 'text'; text: string }
  | { type: 'image'; image: string; mimeType: string }
  | { type: 'tool_use'; id: string; name: string; input: any }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }
  | { type: 'attachment'; attachmentId: string; label: string };

export interface Message {
  role: Role;
  content: string | MessageBlock[];
  metrics?: {
    tokens?: number;
    latency_ms?: number;
  };
  reasoning?: Reasoning;
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
  // Additional session metadata
  activeOrchestrator?: string;
  lastUpdated?: string;
  handoverData?: {
    previousOrchestrator?: string;
    transferTimestamp?: number;
    correlationId?: string;
  };
  agentId?: string;
  sessionId?: string;
}

export const createInitialState = (systemPrompt: string): SessionState => ({
  conversationId: null,
  messages: [],
  systemPrompt,
  metadata: {},
});
