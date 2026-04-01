/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Concrete implementation of the LLM provider using Anthropic SDK.
 * Implements the Domain LLMProvider interface.
 */

import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMResponse } from '../../domain/LLMProvider';
import { Message } from '../../domain/SessionState';
import { ToolDefinition } from '../../domain/ToolDefinition';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async createMessage(
    messages: Message[],
    tools: ToolDefinition[]
  ): Promise<LLMResponse> {
    const response = await this.client.beta.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4096,
      messages: messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content as any
      })),
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
      })),
      betas: ['computer-use-2024-10-22'],
    });

    return {
      content: response.content
    };
  }
}
