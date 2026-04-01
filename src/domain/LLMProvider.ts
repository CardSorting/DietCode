/**
 * [LAYER: DOMAIN]
 * Principle: Pure interface for the LLM provider.
 * No external API dependencies.
 */

import type { Message } from './SessionState';
import type { ToolDefinition } from './ToolDefinition';

export interface LLMResponse {
  content: any[];
}

export interface LLMProvider {
  createMessage(
    messages: Message[],
    tools: ToolDefinition[],
    metadata?: { taskId?: string; agentId?: string }
  ): Promise<LLMResponse>;
}
