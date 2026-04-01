/**
 * [LAYER: DOMAIN]
 * Principle: Pure interface for the LLM provider.
 * No external API dependencies.
 */

import type { Reasoning } from './memory/Reasoning';
import type { Message } from './context/SessionState';
import type { ToolDefinition } from './agent/ToolDefinition';
import type { Agent } from './agent/Agent';

export interface LLMResponse {
  content: any[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  reasoning?: Reasoning;
}

export interface LLMProvider {
  createMessage(
    agent: Agent,
    messages: Message[],
    tools: ToolDefinition[],
    metadata?: { taskId?: string }
  ): Promise<LLMResponse>;
}
