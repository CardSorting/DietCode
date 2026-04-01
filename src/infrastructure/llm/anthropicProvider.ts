/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Concrete implementation of the LLM provider using Anthropic SDK.
 * Implements the Domain LLMProvider interface.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, LLMResponse } from '../../domain/LLMProvider';
import type { Message } from '../../domain/SessionState';
import type { ToolDefinition } from '../../domain/ToolDefinition';
import { SovereignDb } from '../database/SovereignDb';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async createMessage(
    messages: Message[],
    tools: ToolDefinition[],
    metadata?: { taskId?: string; agentId?: string }
  ): Promise<LLMResponse> {
    const startTime = Date.now();
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

    const completionTime = Date.now();
    
    // Log telemetry to BroccoliDB asynchronously
    this.logTelemetry(response, metadata, completionTime - startTime).catch(err => {
      console.error('[TELEMETRY] Failed to log:', err);
    });

    return {
      content: response.content
    };
  }

  private async logTelemetry(response: any, metadata: any, duration: number) {
    try {
      const db = await SovereignDb.db();
      const usage = response.usage;
      const modelId = response.model;
      
      const promptTokens = usage?.input_tokens ?? 0;
      const completionTokens = usage?.output_tokens ?? 0;
      const totalTokens = promptTokens + completionTokens;
      
      // Cost calculation for Claude 3.7 Sonnet
      const inputCost = (promptTokens / 1_000_000) * 3.0;
      const outputCost = (completionTokens / 1_000_000) * 15.0;
      const totalCost = inputCost + outputCost;

      await db.insertInto('telemetry' as any)
        .values({
          id: globalThis.crypto.randomUUID(),
          repoPath: process.cwd(),
          agentId: metadata?.agentId ?? 'dietcode-default',
          taskId: metadata?.taskId ?? null,
          promptTokens,
          completionTokens,
          totalTokens,
          modelId: modelId,
          cost: totalCost,
          timestamp: Date.now(),
          environment: JSON.stringify({ duration, platform: process.platform }),
        } as any)
        .execute();
    } catch (error) {
      // Fail silently to not disrupt the main flow
    }
  }
}
