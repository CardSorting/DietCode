/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
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
 * Concrete implementation of LLMAdapter for Google Gemini.
 * Optimized for Gemini 2.0 and 3.0 models.
 */
export class GeminiAdapter implements LLMAdapter {
  private client: GoogleGenerativeAI;
  private modelId: string;

  constructor(config: AdapterConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.modelId = config.model || 'gemini-3.1-pro-preview';
  }

  createMessage(system: string, messages: Message[], tools?: ToolDefinition[]): ApiStream {
    const model = this.client.getGenerativeModel({
      model: this.modelId,
      systemInstruction: system,
    });

    return {
      async *[Symbol.asyncIterator]() {
        const history = messages.slice(0, -1).map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

        const lastMessage = messages[messages.length - 1];
        if (!lastMessage) {
            yield 'Error: No user message provided.';
            return;
        }

        const chat = model.startChat({ history });

        const result = await chat.sendMessageStream(lastMessage.content);

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            MetabolicMonitor.getInstance().recordTokens(1);
            yield text;
          }
        }
      },
    };
  }

  getModelInfo(): ModelInfo {
    return {
      id: this.modelId,
      name: 'Google Gemini',
      maxTokens: 1048576,
      supportsPromptCache: true,
      supportsReasoning: true,
      supportsStreaming: true,
      inputPrice: 4.0, // USD per 1M tokens (3.1 Pro tier 2)
      outputPrice: 18.0,
      cacheReadsPrice: 0.4,
    };
  }

  getThinkingBudgetTokenLimit(): number {
    return 32768;
  }

  getPromptStrategy(): PromptStrategy {
    return EnumPromptStrategy.GEMINI;
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      { 
        id: 'gemini-3.1-pro-preview', 
        name: 'Gemini 3.1 Pro (Preview)', 
        maxTokens: 1048576, 
        supportsPromptCache: true, 
        supportsReasoning: true, 
        supportsStreaming: true,
        inputPrice: 4.0,
        outputPrice: 18.0,
        cacheReadsPrice: 0.4
      },
      { 
        id: 'gemini-3-pro-preview', 
        name: 'Gemini 3 Pro (Preview)', 
        maxTokens: 1048576, 
        supportsPromptCache: true, 
        supportsReasoning: true, 
        supportsStreaming: true,
        inputPrice: 4.0,
        outputPrice: 18.0
      },
      { 
        id: 'gemini-2.0-flash', 
        name: 'Gemini 2.0 Flash', 
        maxTokens: 1048576, 
        supportsPromptCache: true, 
        supportsReasoning: false, 
        supportsStreaming: true,
        inputPrice: 0.1,
        outputPrice: 0.4
      },
    ];
  }

  async dispose(): Promise<void> {
    // Teardown
  }
}
