/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import OpenAI from 'openai';
import type {
  AdapterConfig,
  ApiStream,
  LLMAdapter,
  Message,
  ModelInfo,
  PromptStrategy,
} from '../../../domain/agent/LLMProviderAdapter';
import { PromptStrategy as EnumPromptStrategy } from '../../../domain/agent/LLMProviderAdapter';
import type { ToolDefinition } from '../../../domain/agent/ToolDefinition';
import { MetabolicMonitor } from '../../monitoring/MetabolicMonitor';

/**
 * [LAYER: INFRASTRUCTURE]
 * Concrete implementation of LLMAdapter for OpenAI.
 */
export class OpenAIAdapter implements LLMAdapter {
  private client: OpenAI;
  private modelId: string;

  constructor(config: AdapterConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiBase,
    });
    this.modelId = config.model;
  }

  createMessage(system: string, messages: Message[], tools?: ToolDefinition[]): ApiStream {
    const client = this.client;
    const modelId = this.modelId;

    return {
      async *[Symbol.asyncIterator]() {
        const stream = await client.chat.completions.create({
          model: modelId,
          messages: [
            { role: 'system', content: system },
            ...messages.map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
          ],
          tools: tools?.map((t) => ({
            type: 'function',
            function: {
              name: t.name,
              description: t.description,
              parameters: t.inputSchema,
            },
          })),
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            MetabolicMonitor.getInstance().recordTokens(1);
            yield content;
          }
        }
      },
    };
  }

  getModelInfo(): ModelInfo {
    return {
      id: this.modelId,
      name: 'OpenAI Model',
      maxTokens: 128000,
      supportsPromptCache: true,
      supportsReasoning: true,
      supportsStreaming: true,
      costPerThousandTokens: {
        input: 0.01,
        output: 0.03,
      },
    };
  }

  getThinkingBudgetTokenLimit(): number {
    return 0;
  }

  getPromptStrategy(): PromptStrategy {
    return EnumPromptStrategy.OPENAI;
  }
}
