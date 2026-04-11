/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as vscode from 'vscode';
import type { LLMProvider, LLMResponse } from '../../../domain/LLMProvider';
import type { Agent } from '../../../domain/agent/Agent';
import type { ToolDefinition } from '../../../domain/agent/ToolDefinition';
import type { Message } from '../../../domain/context/SessionState';
import type { LogService } from '../../../domain/logging/LogService';

export class VsCodeLmProvider implements LLMProvider {
  constructor(
    private logService: LogService,
    private modelSelector: vscode.LanguageModelChatSelector = {},
  ) {}

  async createMessage(
    agent: Agent,
    messages: Message[],
    tools: ToolDefinition[],
    metadata?: { taskId?: string },
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      const models = await vscode.lm.selectChatModels(this.modelSelector);
      if (models.length === 0) {
        throw new Error('No VS Code Language Models available for the given selector');
      }

      const model = models[0]!;
      const vsCodeMessages: vscode.LanguageModelChatMessage[] = this.convertToVsCodeMessages(
        agent.systemPrompt,
        messages,
      );

      const requestOptions: vscode.LanguageModelChatRequestOptions = {
        justification: `DietCode is executing a task: ${metadata?.taskId || 'unknown'}`,
      };

      const response = await model.sendRequest(
        vsCodeMessages,
        requestOptions,
        new vscode.CancellationTokenSource().token,
      );

      let text = '';
      for await (const chunk of response.text) {
        text += chunk;
      }

      return {
        content: [{ type: 'text', text }],
        usage: {
          input_tokens: 0, // vscode.lm doesn't provide usage in real-time easily yet
          output_tokens: 0,
        },
      };
    } catch (error) {
      this.logService.error('[VSCODE-LM] Request failed', { error: (error as Error).message });
      throw error;
    }
  }

  async ping(): Promise<boolean> {
    try {
      const models = await vscode.lm.selectChatModels(this.modelSelector);
      return models.length > 0;
    } catch (error) {
      return false;
    }
  }

  private convertToVsCodeMessages(
    systemPrompt: string,
    messages: Message[],
  ): vscode.LanguageModelChatMessage[] {
    const vsCodeMessages: vscode.LanguageModelChatMessage[] = [
      vscode.LanguageModelChatMessage.Assistant(systemPrompt),
    ];

    for (const msg of messages) {
      const content =
        typeof msg.content === 'string'
          ? msg.content
          : msg.content
              .map((c) => {
                if (c.type === 'text') return c.text;
                if (c.type === 'tool_use') return `[Tool Use: ${c.name}]`;
                if (c.type === 'tool_result') return `[Tool Result: ${c.content}]`;
                return '';
              })
              .join('\n');

      if (msg.role === 'user') {
        vsCodeMessages.push(vscode.LanguageModelChatMessage.User(content));
      } else {
        vsCodeMessages.push(vscode.LanguageModelChatMessage.Assistant(content));
      }
    }

    return vsCodeMessages;
  }
}
