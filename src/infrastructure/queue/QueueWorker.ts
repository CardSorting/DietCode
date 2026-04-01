/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Background worker for DietCode using SqliteQueue.
 * Offloads heavy or non-blocking work from the main interactive loop.
 */

import { SovereignDb } from '../database/SovereignDb';
import type { DecisionRepository } from '../../domain/DecisionRepository';
import type { MemoryService } from '../../core/MemoryService';
import type { SelfHealingService } from '../../core/SelfHealingService';
import type { LLMProvider } from '../../domain/LLMProvider';
import type { AgentRegistry } from '../../core/AgentRegistry';

export class QueueWorker {
  private isProcessing = false;

  constructor(
    private decisions: DecisionRepository,
    private memory: MemoryService,
    private healing: SelfHealingService,
    private agentRegistry: AgentRegistry,
    private provider: LLMProvider
  ) {}

  /**
   * Starts the background processing loop.
   */
  async start() {
    if (this.isProcessing) return;
    const queue = await SovereignDb.getQueue();
    
    console.log('[WORKER] Sovereign Queue Worker started.');
    
    // Process jobs with concurrency of 5
    // Each job is polled from the 'queue_jobs' table in BroccoliDB
    queue.process(async (job) => {
      const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
      
      console.log(`[WORKER] Executing: ${payload.type} [${job.id}]`);
      
      switch (payload.type) {
        case 'KNOWLEDGE_INGEST':
          await this.handleKnowledgeIngest(job.id, payload.data);
          break;
        case 'CODE_HEAL':
          await this.handleCodeHeal(payload);
          break;
        case 'CODE_ANALYZE':
          // Simulated heavy analysis task
          await new Promise(resolve => setTimeout(resolve, 3000));
          break;
        default:
          console.warn(`[WORKER] Unknown job type: ${payload.type}`);
      }
    }, { concurrency: 5 });

    this.isProcessing = true;
  }

  private async handleKnowledgeIngest(jobId: string, data: any) {
    const { userId, type, content, metadata } = data;
    await this.decisions.ingestKnowledge(userId, type, content, metadata);
    
    // Triple Down: Memory Distillation
    if (type === 'task_outcome') {
        await this.memory.distill(jobId, content);
    }

    console.log(`[WORKER] Successfully ingested knowledge from queue.`);
  }

  private async handleCodeHeal(payload: any) {
    const { violation, specialistId } = payload;
    const agent = this.agentRegistry.getAgent(specialistId);
    
    if (!agent) {
        console.error(`[WORKER] Specialist ${specialistId} not found for healing.`);
        return;
    }

    console.log(`[WORKER] Specialist ${agent.title} is healing ${violation.file}...`);

    // Triple Down: Autonomous Reasoning for Refactoring
    const prompt = `[SELF-HEALING TASK]
Violation: ${violation.message}
File: ${violation.file}
Type: ${violation.type}

Please propose a refactor to fix this architectural violation.`;

    const response = await this.provider.createMessage(
      agent,
      [{ role: 'user', content: [{ type: 'text', text: prompt }], timestamp: new Date().toISOString() }],
      []
    );

    const rationale = response.reasoning?.join('\n') || 'Architectural correction';
    const proposedCode = response.content.find((c: any) => c.type === 'text')?.text || '';

    await this.healing.recordProposal({
      id: crypto.randomUUID(),
      violationId: violation.id,
      violation,
      rationale,
      proposedCode,
      status: 'pending' as any,
      createdAt: new Date().toISOString()
    });
  }
}
