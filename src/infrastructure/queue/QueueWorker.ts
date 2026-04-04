import type { AgentRegistry } from '../../core/capabilities/AgentRegistry';
import type { SelfHealingService } from '../../core/integrity/SelfHealingService';
import type { MemoryService } from '../../core/memory/MemoryService';
import type { LLMProvider } from '../../domain/LLMProvider';
import type { LogService } from '../../domain/logging/LogService';
import type { DecisionRepository } from '../../domain/memory/DecisionRepository';
import type { IntegrityReport, IntegrityViolation } from '../../domain/memory/Integrity';
import { IntegrityPolicy } from '../../domain/memory/IntegrityPolicy';
import { IntegrityAdapter } from '../IntegrityAdapter';
import { SemanticIntegrityAdapter } from '../SemanticIntegrityAdapter';
import { Core } from '../database/sovereign/Core';

export interface DietCodeJob {
  id: string;
  payload: string | Record<string, any>;
  status: string;
}

export class QueueWorker {
  private isProcessing = false;

  constructor(
    private decisions: DecisionRepository,
    private memory: MemoryService,
    private healing: SelfHealingService,
    private agentRegistry: AgentRegistry,
    private provider: LLMProvider,
    private logService: LogService,
  ) {}

  /**
   * Starts the background processing loop.
   */
  async start() {
    if (this.isProcessing) return;
    const queue = await Core.getQueue();

    this.logService.info('Sovereign Queue Worker started', {}, { component: 'QueueWorker' });

    // V2.0 processing loop: (payload, fullJob)
    // Using explicit typing for DietCode v2 integration
    await (queue as { process: Function }).process(
      async (payload: { type: string; data?: any; payload?: any }, job: DietCodeJob) => {
        this.logService.info(
          'Executing job',
          { type: payload.type, jobId: job.id },
          { component: 'QueueWorker' },
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
          case 'INTEGRITY_SHARD':
            await this.handleIntegrityShard(job.id, payload.payload);
            break;
          case 'SEMANTIC_SHARD':
            await this.handleSemanticShard(job.id, payload.payload);
            break;
          default:
            this.logService.warn(
              `Unknown job type: ${payload.type}`,
              { type: payload.type },
              { component: 'QueueWorker' },
            );
        }
      },
      { concurrency: 5 },
    );

    this.isProcessing = true;
  }

  private async handleCodeAnalyze(payload: any) {
    const { repoPath, taskId } = payload.data;
    const agent =
      this.agentRegistry.getAgent('agent-architect') ||
      this.agentRegistry.getAgent(this.agentRegistry.defaultAgentId);

    if (!agent) {
      this.logService.error(
        'No agent available for analysis',
        { repoPath, taskId },
        { component: 'QueueWorker' },
      );
      return;
    }

    this.logService.info(
      'Specialist performing deep audit',
      { specialist: agent.title, repoPath },
      { component: 'QueueWorker' },
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
      [
        {
          role: 'user',
          content: [{ type: 'text', text: prompt }],
          timestamp: new Date().toISOString(),
        },
      ],
      [],
    );

    const report =
      response.content
        .filter(
          (c: { type: string; text?: string }): c is { type: 'text'; text: string } =>
            c.type === 'text',
        )
        .map((c: { text: string }) => c.text)
        .join('\n') || 'No issues found';

    await this.memory.distill(taskId, `Deep Audit Report for ${repoPath}:\n${report}`);
    this.logService.info(
      'Deep audit completed and distilled into memory',
      { repoPath, taskId },
      { component: 'QueueWorker' },
    );
  }

  private async handleKnowledgeIngest(jobId: string, data: any) {
    const { userId, type, content, metadata } = data;
    await this.decisions.ingestKnowledge(userId, type, content, metadata);

    // Triple Down: Memory Distillation
    if (type === 'task_outcome') {
      await this.memory.distill(jobId, content);
    }

    this.logService.info(
      'Successfully ingested knowledge from queue',
      { type, userId },
      { component: 'QueueWorker' },
    );
  }

  private async handleCodeHeal(payload: any) {
    const { violation, specialistId } = payload;
    const agent = this.agentRegistry.getAgent(specialistId);

    if (!agent) {
      this.logService.error(
        'Specialist not found for healing',
        { specialistId, violationFile: violation.file },
        { component: 'QueueWorker' },
      );
      return;
    }

    this.logService.info(
      'Specialist healing file',
      { specialist: agent.title, file: violation.file },
      { component: 'QueueWorker' },
    );

    // Triple Down: Autonomous Reasoning for Refactoring
    const prompt = `[SELF-HEALING TASK]
Violation: ${violation.message}
File: ${violation.file}
Type: ${violation.type}

Please propose a refactor to fix this architectural violation.`;

    const response = await this.provider.createMessage(
      agent,
      [
        {
          role: 'user',
          content: [{ type: 'text', text: prompt }],
          timestamp: new Date().toISOString(),
        },
      ],
      [],
    );

    const rationale =
      response.reasoning?.map((r: { text?: string }) => r.text || '').join('\n') ||
      'Architectural correction';
    const proposedCode =
      response.content
        .filter(
          (c: { type: string; text?: string }): c is { type: 'text'; text: string } =>
            c.type === 'text',
        )
        .map((c: { text: string }) => c.text)
        .join('\n') || '';

    await this.healing.recordProposal({
      id: crypto.randomUUID(),
      violationId: violation.id,
      violation,
      rationale,
      proposedCode,
      status: 'pending' as any,
      confidence: 1.0,
      createdAt: new Date().toISOString(),
    });
  }

  private async handleIntegrityShard(jobId: string, payload: any) {
    const { correlationId, shardId, files, projectRoot } = payload;

    this.logService.info(
      'Processing integrity shard',
      { correlationId, shardId, fileCount: files.length },
      { component: 'QueueWorker' },
    );

    const policy = new IntegrityPolicy();
    const scanner = new IntegrityAdapter(policy, this.logService, true); // isWorker = true

    try {
      const report = await scanner.scanFiles(files, projectRoot);

      await Core.push({
        type: 'insert',
        table: 'integrity_shard_results',
        values: {
          id: crypto.randomUUID(),
          correlationId,
          shardId,
          status: 'completed',
          result: JSON.stringify(report),
          timestamp: Date.now(),
        },
      });

      this.logService.info(
        'Shard completed',
        { correlationId, shardId, violations: report.violations.length },
        { component: 'QueueWorker' },
      );
    } catch (err: unknown) {
      const errorMsg = (err as Error).message;
      this.logService.error(
        'Shard failed',
        { correlationId, shardId, error: errorMsg },
        { component: 'QueueWorker' },
      );

      await Core.push({
        type: 'insert',
        table: 'integrity_shard_results',
        values: {
          id: crypto.randomUUID(),
          correlationId,
          shardId,
          status: 'failed',
          error: errorMsg,
          timestamp: Date.now(),
        },
      });
    }
  }

  private async handleSemanticShard(jobId: string, payload: any) {
    const { taskId, file, projectRoot } = payload;

    this.logService.info(
      'Processing semantic shard',
      { taskId, file },
      { component: 'QueueWorker' },
    );

    const policy = new IntegrityPolicy();
    const scanner = new SemanticIntegrityAdapter(policy);

    try {
      const report = await scanner.scanFile(file, projectRoot);
      await this.reportJobResult(taskId, 0, 'completed', report);

      this.logService.info(
        'Semantic shard completed',
        { taskId, file, violations: report.violations.length },
        { component: 'QueueWorker' },
      );
    } catch (err: any) {
      this.logService.error(
        'Semantic shard failed',
        { taskId, file, error: err.message },
        { component: 'QueueWorker' },
      );
      await this.reportJobResult(taskId, 0, 'failed', undefined, err.message);
    }
  }

  private async reportJobResult(
    taskId: string,
    shardId: number,
    status: string,
    payload?: any,
    error?: string,
  ) {
    // Hive Pattern: Zero-Latency result reporting
    await Core.push({
      type: 'insert',
      table: 'job_results',
      values: {
        id: crypto.randomUUID(),
        taskId,
        shardId,
        status,
        payload: payload ? JSON.stringify(payload) : null,
        error: error || null,
        timestamp: Date.now(),
      },
    });

    await Core.push({
      type: 'update',
      table: 'sovereign_tasks',
      values: {
        completed_shards: (Core.pool.constructor as any).increment(1),
        updated_at: Date.now(),
      },
      where: { column: 'id', operator: '=', value: taskId },
    });
  }
}
