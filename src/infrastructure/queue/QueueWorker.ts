/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Background worker for DietCode using SqliteQueue.
 * Offloads heavy or non-blocking work from the main interactive loop.
 * Uses structured logging for production-grade observability.
 */

import { SovereignDb } from '../database/SovereignDb';
import type { DecisionRepository } from '../../domain/memory/DecisionRepository';
import type { MemoryService } from '../../core/memory/MemoryService';
import type { SelfHealingService } from '../../core/integrity/SelfHealingService';
import type { LLMProvider } from '../../domain/LLMProvider';
import type { AgentRegistry } from '../../core/capabilities/AgentRegistry';
import type { LogService } from '../../domain/logging/LogService';

export class QueueWorker {
  private isProcessing = false;

  constructor(
    private decisions: DecisionRepository,
    private memory: MemoryService,
    private healing: SelfHealingService,
    private agentRegistry: AgentRegistry,
    private provider: LLMProvider,
    private logService: LogService
  ) {}

  /**
   * Starts the background processing loop.
   */
  async start() {
    if (this.isProcessing) return;
    const queue = await SovereignDb.getQueue();
    
    this.logService.info('Sovereign Queue Worker started', {}, { component: 'QueueWorker' });
    
    // Process jobs with concurrency of 5
    // Each job is polled from the 'queue_jobs' table in BroccoliDB
    queue.process(async (job) => {
      const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
      
      this.logService.info(
        `Executing job`,
        { type: payload.type, jobId: job.id },
        { component: 'QueueWorker' }
      );
      
      switch (payload.type) {
        case 'KNOWLEDGE_INGEST':
          await this.handleKnowledgeIngest(job.id, payload.data);
          break;
        case 'CODE_HEAL':
          await this.handleCodeHeal(payload);
          break;
        case 'CODE_ANALYZE':
          await this.handleCodeAnalyze(payload);
          break;
        default:
          this.logService.warn(`Unknown job type: ${payload.type}`, { type: payload.type }, { component: 'QueueWorker' });
      }
    }, { concurrency: 5 });

    this.isProcessing = true;
  }

  private async handleCodeAnalyze(payload: any) {
    const { repoPath, taskId } = payload.data;
    const agent = this.agentRegistry.getAgent('agent-architect') || this.agentRegistry.getAgent(this.agentRegistry.defaultAgentId);
    
    if (!agent) {
      this.logService.error(`No agent available for analysis`, { repoPath, taskId }, { component: 'QueueWorker' });
      return;
    }

    this.logService.info(
      `Specialist performing deep audit`,
      { specialist: agent.title, repoPath },
      { component: 'QueueWorker' }
    );

    const prompt = `[DEEP AUDIT TASK]
Repository: ${repoPath}
Session ID: ${taskId}

Please perform a deep architectural audit of the current codebase. 
Focus on:
1. Layer boundary violations.
2. Circular dependencies.
3. Resource leaks or unclosed connections.
4. Security vulnerabilities in infrastructure.

Provide a structured report.`;

    const response = await this.provider.createMessage(
      agent,
      [{ role: 'user', content: [{ type: 'text', text: prompt }], timestamp: new Date().toISOString() }],
      []
    );

    const report = response.content
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map(c => c.text)
      .join('\n') || 'No issues found';
    
    await this.memory.distill(taskId, `Deep Audit Report for ${repoPath}:\n${report}`);
    this.logService.info('Deep audit completed and distilled into memory', { repoPath, taskId }, { component: 'QueueWorker' });
  }

  private async handleKnowledgeIngest(jobId: string, data: any) {
    const { userId, type, content, metadata } = data;
    await this.decisions.ingestKnowledge(userId, type, content, metadata);
    
    // Triple Down: Memory Distillation
    if (type === 'task_outcome') {
      await this.memory.distill(jobId, content);
    }

    this.logService.info('Successfully ingested knowledge from queue', { type, userId }, { component: 'QueueWorker' });
  }

  private async handleCodeHeal(payload: any) {
    const { violation, specialistId } = payload;
    const agent = this.agentRegistry.getAgent(specialistId);
    
    if (!agent) {
      this.logService.error(
        `Specialist not found for healing`,
        { specialistId, violationFile: violation.file },
        { component: 'QueueWorker' }
      );
      return;
    }

    this.logService.info(
      `Specialist healing file`,
      { specialist: agent.title, file: violation.file },
      { component: 'QueueWorker' }
    );

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

    const rationale = response.reasoning?.map(r => r.text || '').join('\n') || 'Architectural correction';
    const proposedCode = response.content
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map(c => c.text)
      .join('\n') || '';

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