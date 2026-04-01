/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic for session and conversation state.
 * No external imports or I/O.
 */

export type Role = 'user' | 'assistant' | 'system';

export interface ToolUse {
  id: string;
  name: string;
  input: any;
}

export interface ToolResult {
  tool_use_id: string;
  content: string;
  isError?: boolean;
}

export interface Message {
  role: Role;
  content: string | (ToolUse | ToolResult)[];
}

export interface SessionState {
  messages: Message[];
  systemPrompt: string;
  metadata: Record<string, any>;
}

export const createInitialState = (systemPrompt: string): SessionState => ({
  messages: [],
  systemPrompt,
  metadata: {},
});
