/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Concrete implementation of the LLM provider using Anthropic SDK.
 * Implements the Domain LLMProvider interface.
 * Uses structured logging for production-grade observability.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, LLMResponse } from '../../../domain/LLMProvider';
import type { Message } from '../../../domain/context/SessionState';
import type { ToolDefinition } from '../../../domain/agent/ToolDefinition';
import type { Agent } from '../../../domain/agent/Agent';
import { Core } from '../../database/sovereign/Core';
import type { LogService } from '../../../domain/logging/LogService';
import { MetabolicMonitor } from '../../monitoring/MetabolicMonitor';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private monitor = MetabolicMonitor.getInstance();

  constructor(apiKey: string, private logService: LogService) {
    this.client = new Anthropic({ apiKey });
  }

  async createMessage(
    agent: Agent,
    messages: Message[],
    tools: ToolDefinition[],
    metadata?: { taskId?: string }
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    const response = await this.client.beta.messages.create({
      model: agent.model || 'claude-3-7-sonnet-20250219',
      system: agent.systemPrompt,
      max_tokens: agent.def.maxTokens || 4096,
      temperature: agent.def.temperature,
      messages: messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: typeof m.content === 'string' ? m.content : m.content.map(block => {
          if (block.type === 'text') return { type: 'text', text: block.text };
          if (block.type === 'image') return { 
            type: 'image', 
            source: { type: 'base64', media_type: block.mimeType as any, data: block.image } 
          };
          if (block.type === 'tool_use') return { 
            type: 'tool_use', 
            id: block.id, 
            name: block.name, 
            input: block.input 
          };
          if (block.type === 'tool_result') return { 
            type: 'tool_result', 
            tool_use_id: block.tool_use_id, 
            content: block.content,
            is_error: block.is_error
          };
          return { type: 'text', text: `[Unsupported block: ${block.type}]` };
        }) as any
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
    this.logTelemetry(response, agent.id, completionTime - startTime, metadata?.taskId).catch(err => {
      this.logService.error(
        '[TELEMETRY] Failed to log telemetry data',
        { error: (err as Error).message, agentId: agent.id },
        { component: 'AnthropicProvider' }
      );
    });

    const reasoning = response.content
      .filter((c: any) => c.type === 'thinking')
      .map((c: any) => ({
        text: c.thinking,
        type: 'text',
      }));

    const content = response.content.filter((c: any) => c.type !== 'thinking');

    const usage = {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    };

    // Instrument MetabolicMonitor
    this.monitor.recordTokens(usage.input_tokens + usage.output_tokens);

    return {
      content: content as any,
      usage,
      reasoning: reasoning.length > 0 ? reasoning : undefined,
    };
  }

  private async logTelemetry(response: any, agentId: string, duration: number, taskId?: string) {
    try {
      const db = await Core.db();
      const usage = response.usage;
      const modelId = response.model;
      
      const promptTokens = usage?.input_tokens ?? 0;
      const completionTokens = usage?.output_tokens ?? 0;
      const totalTokens = promptTokens + completionTokens;
      
      // Cost calculation for Claude 3.7 Sonnet
      const inputCost = (promptTokens / 1_000_000) * 3.0;
      const outputCost = (completionTokens / 1_000_000) * 15.0;
      const totalCost = inputCost + outputCost;

      await (db as any).insertInto('telemetry' as any)
        .values({
          id: globalThis.crypto.randomUUID(),
          repoPath: process.cwd(),
          agentId: agentId,
          taskId: taskId ?? null,
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

