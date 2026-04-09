/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import OpenAI from 'openai';
import type { LLMProvider, LLMResponse } from '../../../domain/LLMProvider';
import type { Agent } from '../../../domain/agent/Agent';
import type { ToolDefinition } from '../../../domain/agent/ToolDefinition';
import type { Message } from '../../../domain/context/SessionState';
import type { LogService } from '../../../domain/logging/LogService';
import { MetabolicMonitor } from '../../monitoring/MetabolicMonitor';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private monitor = MetabolicMonitor.getInstance();

  constructor(
    apiKey: string,
    private logService: LogService,
  ) {
    this.client = new OpenAI({ apiKey });
  }

  async createMessage(
    agent: Agent,
    messages: Message[],
    tools: ToolDefinition[],
    _metadata?: { taskId?: string },
  ): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: agent.model || 'gpt-4o',
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      })),
      tools: tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema,
        },
      })),
    });

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('OpenAI returned no choices');
    }
    const usage = response.usage
      ? {
          input_tokens: response.usage.prompt_tokens,
          output_tokens: response.usage.completion_tokens,
        }
      : undefined;

    if (usage) {
      this.monitor.recordTokens(usage.input_tokens + usage.output_tokens);
    }

    return {
      content: [{ type: 'text', text: choice.message.content || '' }],
      usage,
    };
  }

  async ping(): Promise<boolean> {
    try {
      // Minimal completion to verify key
      await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      });
      return true;
    } catch (error) {
      this.logService.error('[OPENAI] Ping failed', { error: (error as Error).message });
      return false;
    }
  }
}
