/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMProvider, LLMResponse } from '../../../domain/LLMProvider';
import type { Agent } from '../../../domain/agent/Agent';
import type { ToolDefinition } from '../../../domain/agent/ToolDefinition';
import type { Message } from '../../../domain/context/SessionState';
import type { LogService } from '../../../domain/logging/LogService';
import { MetabolicMonitor } from '../../monitoring/MetabolicMonitor';

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenerativeAI;
  private monitor = MetabolicMonitor.getInstance();

  constructor(
    apiKey: string,
    private logService: LogService,
  ) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async createMessage(
    agent: Agent,
    messages: Message[],
    _tools: ToolDefinition[],
    _metadata?: { taskId?: string },
  ): Promise<LLMResponse> {
    const model = this.client.getGenerativeModel({ 
        model: agent.model || 'gemini-2.0-flash' 
    });
    
    const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
    }));

    const result = await model.generateContent({
        contents: contents as any
    });

    const text = result.response.text();
    const usage = result.response.usageMetadata ? {
        input_tokens: result.response.usageMetadata.promptTokenCount,
        output_tokens: result.response.usageMetadata.candidatesTokenCount
    } : undefined;

    if (usage) {
        this.monitor.recordTokens(usage.input_tokens + usage.output_tokens);
    }

    return {
        content: [{ type: 'text', text }],
        usage
    };
  }

  async ping(): Promise<boolean> {
    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });
      await model.generateContent('ping');
      return true;
    } catch (error) {
      this.logService.error('[GEMINI] Ping failed', { error: (error as Error).message });
      return false;
    }
  }
}
