/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Scoring Worker — Offloads heavy scoring calculations to a background process.
 *
 * Handles:
 * - SEMANTIC_SCORING: n-grams, similarity, entropy.
 * - IMPACT_SCORING: Architectural impact simulation.
 */

import { JobType } from '../../domain/system/QueueProvider';
import { Core } from '../database/sovereign/Core';
import { MetabolicRecorder } from '../database/sovereign/MetabolicRecorder';
import { ScoringCache } from '../database/sovereign/ScoringCache';
import { ArchitecturalImpactAnalyzer } from '../simulation/ArchitecturalImpactAnalyzer';
import { SemanticIntegrityAnalyser } from '../task/SemanticIntegrityAnalyser';

export class ScoringWorker {
  private semanticAnalyzer = new SemanticIntegrityAnalyser();
  private impactAnalyzer = new ArchitecturalImpactAnalyzer();
  private isProcessing = false;

  /**
   * Start the scoring loop via broccoliq.process.
   */
  async start(): Promise<void> {
    if (this.isProcessing) return;
    const queue = await Core.getQueue();
    const db = await Core.db();

    console.log('📊 Scoring Worker: INITIALIZED');
    this.isProcessing = true;

    (queue as any)?.process(
      async (job: any) => {
        const start = Date.now();
        const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
        const { taskId, shardId, payload: innerPayload } = payload;

        try {
          let result: any;
          const jobType = (job as any).type;

          // Pass 19: Tiered Caching Check
          let cacheKey = '';
          if (jobType === JobType.SEMANTIC_SCORING && innerPayload.content) {
            cacheKey = SemanticIntegrityAnalyser.calculateHash(innerPayload.content);
            const cached = await ScoringCache.getScoringCache(cacheKey);
            if (cached) {
              console.log(`[ScoringWorker] Cache HIT for task ${taskId}`);
              result = cached;
            }
          }

          if (!result) {
            if (jobType === JobType.SEMANTIC_SCORING) {
              console.log(`[ScoringWorker] Calculating Semantic Integrity for task ${taskId}`);
              result = this.semanticAnalyzer.calculateSemanticIntegrity(
                innerPayload.content,
                innerPayload.tokenHashes || [],
              );
              if (cacheKey) await ScoringCache.setScoringCache(cacheKey, result);
            } else if (jobType === JobType.IMPACT_SCORING) {
              console.log(`[ScoringWorker] Calculating Architectural Impact for task ${taskId}`);
              result = this.impactAnalyzer.calculateImpact(
                innerPayload.newViolations,
                innerPayload.currentViolations,
              );
            } else {
              return; // Not a scoring job
            }
          }

          // Record result in BroccoliDB
          await (db as any)
            .insertInto('job_results' as any)
            .values({
              id: Math.random().toString(36).substring(7),
              taskId,
              shardId: shardId || 0,
              status: 'completed',
              payload: JSON.stringify(result),
              timestamp: Date.now(),
            })
            .execute();

          // Metabolic Telemetry: CPU Cost
          const duration = Date.now() - start;
          await MetabolicRecorder.recordMetabolicEvent({
            taskId,
            linesAdded: 0,
            reads: 1,
            writes: 1,
            cognitiveHeat: duration / 1000,
          } as any);

          console.log(`✅ [ScoringWorker] Job ${job.id} completed in ${duration}ms.`);
        } catch (err: any) {
          console.error(`❌ [ScoringWorker] Job ${job.id} FAILED: ${err.message}`);
          await (db as any)
            .insertInto('job_results' as any)
            .values({
              id: Math.random().toString(36).substring(7),
              taskId,
              shardId: shardId || 0,
              status: 'failed',
              error: err.message,
              timestamp: Date.now(),
            })
            .execute();
        }
      },
      { concurrency: 5 },
    );
  }

  stop(): void {
    this.isProcessing = false;
    console.log('🛑 Scoring Worker: STOPPED');
  }
}
