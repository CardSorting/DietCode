/**
 * [LAYER: CORE]
 * Principle: Cognitive Continuity — manages the distillation and recall of knowledge.
 */

import { KnowledgeType, type KnowledgeItem, type KnowledgeRepository } from '../domain/Knowledge';
import type { LLMProvider } from '../domain/LLMProvider';
import type { AgentRegistry } from './AgentRegistry';

export class MemoryService {
  constructor(
    private repository: KnowledgeRepository,
    private llmProvider: LLMProvider,
    private agentRegistry: AgentRegistry
  ) {}

  /**
   * Recalls relevant knowledge for a given user query or project path.
   */
  async recall(query: string, limit: number = 5): Promise<KnowledgeItem[]> {
    return this.repository.findRelevant(query, limit);
  }

  /**
   * Distills a raw task outcome into a structured KnowledgeItem.
   * This is intended to run as a background job.
   */
  async distill(taskId: string, outcome: string): Promise<void> {
    console.log(`[MEMORY] Distilling outcome for task: ${taskId}`);
    
    const distillationAgent: any = {
      id: 'agent-distiller',
      title: 'Memory Distiller',
      systemPrompt: 'You are a knowledge distillation engine. Extract key learnings, architectural patterns, or reusable facts from task outcomes. Format the response as a clear, concise knowledge item value.',
      def: { maxTokens: 1024 }
    };

    const response = await this.llmProvider.createMessage(
      distillationAgent,
      [{ role: 'user', content: [{ type: 'text', text: `Task Outcome to Distill:\n${outcome}` }], timestamp: new Date().toISOString() }],
      []
    );

    const distilledValue = response.content.find((c: any) => c.type === 'text')?.text || outcome;
    
    const item: KnowledgeItem = {
      id: crypto.randomUUID(),
      key: `learning:${taskId.slice(0, 8)}`,
      value: distilledValue,
      type: KnowledgeType.LEARNING,
      confidence: 0.9,
      tags: ['task_outcome', taskId],
      createdAt: new Date().toISOString(),
    };

    await this.repository.save(item);
  }

  /**
   * Formats a list of knowledge items for injection into a system prompt.
   */
  formatForPrompt(items: KnowledgeItem[]): string {
    if (items.length === 0) return '';

    let prompt = '\n[SOVEREIGN KNOWLEDGE]\n';
    for (const item of items) {
      prompt += `- [${item.type.toUpperCase()}] ${item.key}: ${item.value}\n`;
    }
    return prompt;
  }
}
