/**
 * [LAYER: DOMAIN]
 * Principle: Pure interface for the LLM provider.
 * No external API dependencies.
 */

import { Message } from './SessionState';
import { ToolDefinition } from './ToolDefinition';

export interface LLMResponse {
  content: any[];
}

export interface LLMProvider {
  createMessage(
    messages: Message[],
    tools: ToolDefinition[]
  ): Promise<LLMResponse>;
}
