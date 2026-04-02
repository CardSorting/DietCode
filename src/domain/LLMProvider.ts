/**
 * [LAYER: DOMAIN]
 * Principle: Pure interface for the LLM provider.
 * No external API dependencies.
 */

import type { Reasoning } from './memory/Reasoning';
import type { Message, MessageBlock } from './context/SessionState';
import type { ToolDefinition } from './agent/ToolDefinition';
import type { Agent } from './agent/Agent';

export interface LLMResponse {
  content: MessageBlock[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  reasoning?: Reasoning;
}

/**
 * Global state container
 */
export interface GlobalState {
  [key: string]: any;
}

export interface LLMProvider {
  createMessage(
    agent: Agent,
    messages: Message[],
    tools: ToolDefinition[],
    metadata?: { taskId?: string }
  ): Promise<LLMResponse>;
}
