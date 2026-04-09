/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { 
  LLMAdapter, 
  Message, 
  ApiStream, 
  ModelInfo, 
  PromptStrategy, 
  AdapterConfig 
} from '../../../domain/agent/LLMProviderAdapter';
import { PromptStrategy as EnumPromptStrategy } from '../../../domain/agent/LLMProviderAdapter';
import type { ToolDefinition } from '../../../domain/agent/ToolDefinition';

/**
 * [LAYER: INFRASTRUCTURE]
 * Concrete implementation of LLMAdapter for Anthropic.
 * Satisfies the legacy integration requirements while providing production-grade streaming.
 */
export class AnthropicAdapter implements LLMAdapter {
  private client: Anthropic;
  private model: string;

  constructor(config: AdapterConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
  }

  createMessage(system: string, messages: Message[], tools?: ToolDefinition[]): ApiStream {
    const client = this.client;
    const model = this.model;

    return {
      async *[Symbol.asyncIterator]() {
        const stream = await client.messages.create({
          model: model,
          system: system,
          max_tokens: 4096,
          messages: messages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          })),
          stream: true,
        });

        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            yield chunk.delta.text;
          }
        }
      }
    };
  }

  getModelInfo(): ModelInfo {
    return {
      id: this.model,
      name: 'Anthropic Claude',
      maxTokens: 200000,
      supportsPromptCache: true,
      supportsReasoning: true,
      supportsStreaming: true,
      costPerThousandTokens: {
        input: 0.003,
        output: 0.015
      }
    };
  }

  getThinkingBudgetTokenLimit(): number {
    return 32000;
  }

  getPromptStrategy(): PromptStrategy {
    return EnumPromptStrategy.ANTHROPIC_V0;
  }
}
