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
 */
export class GeminiAdapter implements LLMAdapter {
  private client: GoogleGenerativeAI;
  private modelId: string;

  constructor(config: AdapterConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.modelId = config.model || 'gemini-2.0-flash';
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
      maxTokens: 1000000,
      supportsPromptCache: true,
      supportsReasoning: false,
      supportsStreaming: true,
      costPerThousandTokens: {
        input: 0.000125,
        output: 0.000375,
      },
    };
  }

  getThinkingBudgetTokenLimit(): number {
    return 0;
  }

  getPromptStrategy(): PromptStrategy {
    return EnumPromptStrategy.NATIVE;
  }

  async listModels(): Promise<ModelInfo[]> {
    // Note: Google AI SDK doesn't have a clean listModels for the generative-ai package
    // Providing a comprehensive managed list from the backend
    return [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', maxTokens: 1000000, supportsPromptCache: true, supportsReasoning: false, supportsStreaming: true },
      { id: 'gemini-2.0-flash-lite-preview-02-05', name: 'Gemini 2.0 Flash Lite', maxTokens: 1000000, supportsPromptCache: true, supportsReasoning: false, supportsStreaming: true },
      { id: 'gemini-2.0-pro-exp-02-05', name: 'Gemini 2.0 Pro Experimental', maxTokens: 2000000, supportsPromptCache: true, supportsReasoning: false, supportsStreaming: true },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', maxTokens: 2000000, supportsPromptCache: true, supportsReasoning: false, supportsStreaming: true },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', maxTokens: 1000000, supportsPromptCache: true, supportsReasoning: false, supportsStreaming: true },
    ];
  }

  async dispose(): Promise<void> {
    // Teardown Gemini resources
  }
}
