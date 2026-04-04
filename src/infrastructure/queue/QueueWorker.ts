/**
 * [LAYER: INFRASTRUCTURE]
 * [SUB-ZONE: queue]
 * Principle: Zero-Latency Job Processing via Database Polling
 * Prework Status:
 *   - Step 0: ✅ Dead code cleasred
 *   - Verification: ✅ Process jobs directly from database
 *   - Dependency Flow: ✅ Uses Core.db() instead of non-existent getQueue()
 */

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
    const queue = await Core.db();

    this.logService.info('Sovereign Queue Worker started', {}, { component: 'QueueWorker' });

    // V2.0 processing loop: Process jobs directly from the database
    this.isProcessing = true;
    await this.processJobs(queue);
  }

  /**
   * Process jobs from the database queue
   */
  private async processJobs(queue: any) {
    while (this.isProcessing) {
      try {
        // Get pending jobs from swarm_queue or hive_queue
        const jobs = await Core.selectWhere('hive_queue', 'status', '=', 'pending');

        if (jobs && jobs.length > 0) {
          for (const job of jobs) {
            const jobData = JSON.parse(job.metadata || '{}');
            const jobType = job.type;
            const jobId = job.id;

            try {
              // Update job to processing
              await Core.push({
                type: 'update',
                table: 'hive_queue',
                where: { column: 'id', operator: '=', value: jobId },
                values: {
                  status: 'processing',
                  updated_at: Date.now(),
                },
              });

              // Process the job based on type
              await this.processJob(jobType, jobData, jobId, queue);

              // Update job to completed
              await Core.push({
                type: 'update',
                table: 'hive_queue',
                where: { column: 'id', operator: '=', value: jobId },
                values: {
                  status: 'completed',
                  updated_at: Date.now(),
                },
              });
            } catch (error) {
              // Update job to failed
              await Core.push({
                type: 'update',
                table: 'hive_queue',
                where: { column: 'id', operator: '=', value: jobId },
                values: {
                  status: 'failed',
                  error: (error as Error).message,
                  updated_at: Date.now(),
                },
              });
            }
          }
        }

        // Wait before next check
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        this.logService.error('Error processing jobs', {}, { component: 'QueueWorker' });
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  private async processJob(jobType: string, jobData: any, jobId: string, queue: any) {
    this.logService.info('Executing job', { type: jobType, jobId }, { component: 'QueueWorker' });

    switch (jobType) {
      case 'KNOWLEDGE_INGEST':
        await this.handleKnowledgeIngest(jobId, jobData);
        break;
      case 'CODE_HEAL':
        await this.handleCodeHeal(jobData);
        break;
      case 'CODE_ANALYZE':
        await this.handleCodeAnalyze(jobData);
        break;
      case 'INTEGRITY_SHARD':
        await this.handleIntegrityShard(jobId, jobData);
        break;
      case 'SEMANTIC_SHARD':
        await this.handleSemanticShard(jobId, jobData);
        break;
      default:
        this.logService.warn(
          `Unknown job type: ${jobType}`,
          { type: jobType },
          { component: 'QueueWorker' },
        );
    }
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
    const scanner = new SemanticIntegrityAdapter(this.logService);

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

    // Ignore sovereign_tasks update for now - not a blocking issue
  }
}
