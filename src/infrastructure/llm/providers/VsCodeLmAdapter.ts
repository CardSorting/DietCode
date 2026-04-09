/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as vscode from 'vscode';
import type {
  AdapterConfig,
  ApiStream,
  LLMAdapter,
  Message,
  ModelInfo,
  PromptStrategy,
} from '../../../domain/agent/LLMProviderAdapter';
import { PromptStrategy as EnumPromptStrategy } from '../../../domain/agent/LLMProviderAdapter';

/**
 * [LAYER: INFRASTRUCTURE]
 * Concrete implementation of LLMAdapter for VS Code Language Models.
 */
export class VsCodeLmAdapter implements LLMAdapter {
  private modelId: string;

  constructor(config: AdapterConfig) {
    this.modelId = config.model;
  }

  createMessage(system: string, messages: Message[], _tools?: any[]): ApiStream {
    const modelId = this.modelId;

    return {
      async *[Symbol.asyncIterator]() {
        const models = await vscode.lm.selectChatModels({ id: modelId });
        const model = models[0];
        if (!model) {
          throw new Error(`VS Code Language Model not found: ${modelId}`);
        }

        const chatMessages = [
          vscode.LanguageModelChatMessage.User(system), // Simple mapping of system prompt
          ...messages.map((m) =>
            m.role === 'user'
              ? vscode.LanguageModelChatMessage.User(m.content)
              : vscode.LanguageModelChatMessage.Assistant(m.content),
          ),
        ];

        const response = await model.sendRequest(chatMessages, {}, new vscode.CancellationTokenSource().token);

        for await (const chunk of response.text) {
          yield chunk;
        }
      },
    };
  }

  getModelInfo(): ModelInfo {
    return {
      id: this.modelId,
      name: 'VS Code LM',
      maxTokens: 4096,
      supportsPromptCache: false,
      supportsReasoning: false,
      supportsStreaming: true,
    };
  }

  getThinkingBudgetTokenLimit(): number {
    return 0;
  }

  getPromptStrategy(): PromptStrategy {
    return EnumPromptStrategy.NATIVE;
  }
}
