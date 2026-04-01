/**
 * [LAYER: DOMAIN]
 * Principle: Pure interface for the LLM provider.
 * No external API dependencies.
 */

import type { Message } from './SessionState';
import type { ToolDefinition } from './ToolDefinition';
import type { Agent } from './Agent';

export interface LLMResponse {
  content: any[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface LLMProvider {
  createMessage(
    agent: Agent,
    messages: Message[],
    tools: ToolDefinition[],
    metadata?: { taskId?: string }
  ): Promise<LLMResponse>;
}
