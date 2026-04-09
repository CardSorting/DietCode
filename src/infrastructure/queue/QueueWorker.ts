/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * [SUB-ZONE: queue]
 * Principle: Zero-Latency Job Processing via Database Polling
 * Prework Status:
 *   - Step 0: ✅ Dead code cleasred
 *   - Verification: ✅ Process jobs directly from database
 *   - Dependency Flow: ✅ Uses Core.db() instead of non-existent getQueue()
 */

import * as crypto from 'node:crypto';
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
import type { KyselyDatabase } from '../database/sovereign/DatabaseSchema';

export interface DietCodeJob {
  id: string;
  payload: string | Record<string, any>;
  status: string;
}

export class QueueWorker {
  private isProcessing = false;
  private workerId = `worker-${crypto.randomUUID()}`;

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
    const db = (await Core.db()) as KyselyDatabase;

    this.logService.info(`Sovereign Queue Worker ${this.workerId} started`, {}, { component: 'QueueWorker' });

    // V2.0 processing loop: Process jobs directly from the database
    this.isProcessing = true;
    await this.processJobs(db);
  }

  /**
   * Process jobs from the database queue (Atomic Claiming Pass 19)
   */
  private async processJobs(db: KyselyDatabase) {
    while (this.isProcessing) {
      try {
        // 1. Identify pending jobs
        const jobs = await db
          .selectFrom('hive_queue')
          .select(['id', 'type', 'metadata'])
          .where('status', '=', 'pending')
          .orderBy('created_at', 'asc')
          .limit(10)
          .execute();

        if (jobs && jobs.length > 0) {
          for (const job of jobs) {
            // 2. Atomic Claim
            const claimResult = await db
              .updateTable('hive_queue')
              .set({
                status: 'processing',
                worker_id: this.workerId,
                claimed_at: Date.now(),
                updated_at: Date.now(),
              })
              .where('id', '=', job.id)
              .where('status', '=', 'pending')
              .executeTakeFirst();

            if (Number(claimResult.numUpdatedRows) === 0) continue; // Claimed by someone else

            const jobData = JSON.parse(job.metadata || '{}');
            const jobType = job.type;
            const jobId = job.id;

            try {
              // Process the job based on type
              await this.processJob(jobType, jobData, jobId, db);

              // Update job to completed
              await db
                .updateTable('hive_queue')
                .set({
                  status: 'completed',
                  updated_at: Date.now(),
                })
                .where('id', '=', jobId)
                .execute();
            } catch (error) {
              this.logService.error(`Job ${jobId} failed: ${(error as Error).message}`, {}, { component: 'QueueWorker' });
              // Update job to failed
              await db
                .updateTable('hive_queue')
                .set({
                  status: 'failed',
                  error: (error as Error).message,
                  updated_at: Date.now(),
                })
                .where('id', '=', jobId)
                .execute();
            }
          }
        }

        // Wait before next check
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        this.logService.error('Error in QueueWorker loop', error, { component: 'QueueWorker' });
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

      const db = (await Core.db()) as KyselyDatabase;
      await db
        .insertInto('hive_job_results')
        .values({
          id: crypto.randomUUID(),
          task_id: correlationId,
          shard_id: shardId,
          status: 'completed',
          payload: JSON.stringify(report),
          timestamp: Date.now(),
        })
        .execute();

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

      const db = (await Core.db()) as KyselyDatabase;
      await db
        .insertInto('hive_job_results')
        .values({
          id: crypto.randomUUID(),
          task_id: correlationId,
          shard_id: shardId,
          status: 'failed',
          error: errorMsg,
          timestamp: Date.now(),
        })
        .execute();
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
    const db = (await Core.db()) as KyselyDatabase;
    await db
      .insertInto('hive_job_results')
      .values({
        id: crypto.randomUUID(),
        task_id: taskId,
        shard_id: shardId,
        status,
        payload: payload ? JSON.stringify(payload) : null,
        error: error || null,
        timestamp: Date.now(),
      })
      .execute();
  }
}
