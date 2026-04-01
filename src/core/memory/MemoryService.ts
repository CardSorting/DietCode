/**
 * [LAYER: CORE]
 * Principle: Cognitive Continuity — manages the distillation and recall of knowledge.
 * Uses structured logging for production-grade observability.
 */

import { KnowledgeType, type KnowledgeItem, type KnowledgeRepository } from '../../domain/memory/Knowledge';
import type { LLMProvider } from '../../domain/LLMProvider';
import type { AgentRegistry } from '../capabilities/AgentRegistry';
import type { LogService } from '../../domain/logging/LogService';

export class MemoryService {
  constructor(
    private repository: KnowledgeRepository,
    private llmProvider: LLMProvider,
    private agentRegistry: AgentRegistry,
    private logService: LogService
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
    this.logService.debug(
      `Starting distillation for task ${taskId}`,
      { approximateLength: outcome.length },
      { component: 'MemoryService', sessionId: taskId.substring(0, 8) }
    );
    
    const distillationAgent = this.agentRegistry.getAgent('agent-distiller');
    if (!distillationAgent) {
      this.logService.error(
        `Specialist agent 'agent-distiller' not found for task ${taskId}`,
        { taskId },
        { component: 'MemoryService' }
      );
      throw new Error(`[MEMORY] Specialist agent 'agent-distiller' not found.`);
    }

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
    this.logService.debug(
      `Successfully saved distilled knowledge for task ${taskId}`,
      { knowledgeKey: item.key },
      { component: 'MemoryService', sessionId: taskId.substring(0, 8) }
    );
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