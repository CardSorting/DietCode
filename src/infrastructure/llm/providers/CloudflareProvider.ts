/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Concrete implementation of the LLM provider using Cloudflare Workers AI.
 * Contains both Domain LLMProvider and Core LLMAdapter implementations.
 */

import { OpenAI } from 'openai';
import type { LLMProvider, LLMResponse } from '../../../domain/LLMProvider';
import type { Agent } from '../../../domain/agent/Agent';
import type {
  Message as AdapterMessage,
  ApiStream,
  LLMAdapter,
  ModelInfo,
} from '../../../domain/agent/LLMProviderAdapter';
import { PromptStrategy } from '../../../domain/agent/LLMProviderAdapter';
import type { ToolDefinition } from '../../../domain/agent/ToolDefinition';
import type { Message, MessageBlock } from '../../../domain/context/SessionState';
import type { LogService } from '../../../domain/logging/LogService';
import { Core } from '../../database/sovereign/Core';
import { MetabolicMonitor } from '../../monitoring/MetabolicMonitor';

export interface CloudflareConfig {
  accountId: string;
  apiToken: string;
  model?: string;
  logService: LogService;
}

/**
 * CloudflareProvider
 *
 * Domain-level provider for use with DietCode Agents.
 */
export class CloudflareProvider implements LLMProvider {
  private client: OpenAI;
  private monitor = MetabolicMonitor.getInstance();
  private model: string;
  private logService: LogService;

  constructor(config: CloudflareConfig) {
    this.model = config.model || '@cf/moonshotai/kimi-k2.5';
    this.logService = config.logService;

    this.client = new OpenAI({
      apiKey: config.apiToken,
      baseURL: `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/ai/v1`,
    });
  }

  async createMessage(
    agent: Agent,
    messages: Message[],
    tools: ToolDefinition[],
    metadata?: { taskId?: string },
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    const modelId = agent.model || this.model;

    try {
      const response = await this.client.chat.completions.create({
        model: modelId,
        messages: this.mapMessagesToOpenAI(agent.systemPrompt, messages),
        tools:
          tools.length > 0
            ? tools.map((t) => ({
                type: 'function',
                function: {
                  name: t.name,
                  description: t.description,
                  parameters: t.inputSchema,
                },
              }))
            : undefined,
        temperature: agent.def.temperature,
        max_tokens: agent.def.maxTokens || 4096,
      });

      const completionTime = Date.now();
      const choice = response.choices?.[0];
      if (!choice) {
        throw new Error('Cloudflare API returned no choices');
      }

      const message = choice.message;
      const content: MessageBlock[] = [];

      if (message.content) {
        content.push({ type: 'text', text: message.content });
      }

      if (message.tool_calls) {
        for (const tc of message.tool_calls) {
          if (tc.type === 'function') {
            content.push({
              type: 'tool_use',
              id: tc.id,
              name: tc.function.name,
              input: JSON.parse(tc.function.arguments),
            });
          }
        }
      }

      const usage = {
        input_tokens: response.usage?.prompt_tokens ?? 0,
        output_tokens: response.usage?.completion_tokens ?? 0,
      };

      this.monitor.recordTokens(usage.input_tokens + usage.output_tokens);

      this.logTelemetry(response, agent.id, completionTime - startTime, metadata?.taskId).catch(
        (err) => {
          this.logService.error(
            '[TELEMETRY] Failed to log Cloudflare telemetry',
            { error: (err as Error).message, agentId: agent.id },
            { component: 'CloudflareProvider' },
          );
        },
      );

      return {
        content,
        usage,
      };
    } catch (error: any) {
      this.logService.error(
        `[CLOUDFLARE] API Error: ${error.message}`,
        { model: modelId },
        { component: 'CloudflareProvider' },
      );
      throw error;
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 1,
        messages: [{ role: 'user', content: '1+1' }],
      });
      return true;
    } catch (error) {
      this.logService.error('[CLOUDFLARE] Ping failed', { error: (error as Error).message });
      return false;
    }
  }

  private mapMessagesToOpenAI(system: string, messages: Message[]): any[] {
    const mapped: any[] = [{ role: 'system', content: system }];

    for (const m of messages) {
      if (typeof m.content === 'string') {
        mapped.push({ role: m.role, content: m.content });
      } else {
        const textContent = m.content
          .filter((b) => b.type === 'text')
          .map((b) => (b as any).text)
          .join('\n');

        const toolCalls = m.content
          .filter((b) => b.type === 'tool_use')
          .map((b) => ({
            id: (b as any).id,
            type: 'function',
            function: {
              name: (b as any).name,
              arguments: JSON.stringify((b as any).input),
            },
          }));

        const toolResults = m.content
          .filter((b) => b.type === 'tool_result')
          .map((b) => ({
            role: 'tool',
            tool_call_id: (b as any).tool_use_id,
            content: (b as any).content,
          }));

        if (textContent || toolCalls.length > 0) {
          mapped.push({
            role: m.role,
            content: textContent || null,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
          });
        }

        if (toolResults.length > 0) {
          mapped.push(...toolResults);
        }
      }
    }
    return mapped;
  }

  private async logTelemetry(response: any, agentId: string, duration: number, taskId?: string) {
    try {
      const db = await Core.db();
      const usage = response.usage;
      const modelId = response.model;
      const promptTokens = usage?.prompt_tokens ?? 0;
      const model = response.model;
      const repoPath = process.cwd();

      await (db as any)
        .insertInto('hive_llm_telemetry' as any)
        .values({
          id: globalThis.crypto.randomUUID(),
          repo_path: repoPath,
          agent_id: agentId,
          task_id: taskId ?? null,
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.prompt_tokens + usage.completion_tokens,
          model_id: model,
          cost: 0, // Cloudflare Workers AI is often flat-rate or included
          timestamp: Date.now(),
          environment: JSON.stringify({
            duration,
            platform: process.platform,
            provider: 'cloudflare',
          }),
        } as any)
        .execute();
    } catch (error) {
      // Silent fail
    }
  }
}

/**
 * CloudflareAdapter
 *
 * Core-level adapter for registration and multi-provider orchestration.
 */
export class CloudflareAdapter implements LLMAdapter {
  private client: OpenAI;
  private model: string;

  constructor(config: Omit<CloudflareConfig, 'logService'>) {
    this.model = config.model || '@cf/moonshotai/kimi-k2.5';
    this.client = new OpenAI({
      apiKey: config.apiToken,
      baseURL: `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/ai/v1`,
    });
  }

  createMessage(system: string, messages: AdapterMessage[], _tools?: any[]): ApiStream {
    const self = this;
    return {
      async *[Symbol.asyncIterator]() {
        const stream = await self.client.chat.completions.create({
          model: self.model,
          messages: [
            { role: 'system', content: system },
            ...messages.map((m) => ({
              role: m.role as any,
              content: m.content as string,
            })),
          ],
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk.choices?.[0]?.delta?.content || '';
          if (content) yield content;
        }
      },
    } as any;
  }

  getModelInfo(): ModelInfo {
    return {
      id: this.model,
      name: `Cloudflare ${this.model}`,
      maxTokens: 256000,
      supportsPromptCache: true,
      supportsReasoning: true,
      supportsStreaming: true,
      costPerThousandTokens: {
        input: 0.0006,
        output: 0.003,
      },
    };
  }

  getThinkingBudgetTokenLimit(): number {
    return 0;
  }

  getPromptStrategy(): PromptStrategy {
    return PromptStrategy.OPENAI;
  }
}
