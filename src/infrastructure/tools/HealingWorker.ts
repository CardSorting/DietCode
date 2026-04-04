/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Healing Worker — High-throughput background remediation of organizational debt.
 * Pass 18: Broccoli Flow Protocol.
 */

import * as path from 'node:path';
import { ArchitecturalGuardian } from '../../domain/architecture/ArchitecturalGuardian';
import { JobType } from '../../domain/system/QueueProvider';
import { AuditRecorder } from '../database/sovereign/AuditRecorder';
import { Core } from '../database/sovereign/Core';
import { LockManager } from '../database/sovereign/LockManager';
import { MetabolicRecorder } from '../database/sovereign/MetabolicRecorder';
import { ImportFixer } from './ImportFixer';
import { JoyZoningHealer } from './JoyZoningHealer';
import { RefactorMoveEngine } from './refactor/RefactorMoveEngine';
import { RefactorTagSentinel } from './refactor/RefactorTagSentinel';

export class HealingWorker {
  private importFixer: ImportFixer;
  private tagSentinel: RefactorTagSentinel;
  private joyHealer: JoyZoningHealer;
  private projectRoot: string;
  private isProcessing = false;

  constructor() {
    this.projectRoot = path.resolve(process.cwd(), '.');
    this.importFixer = new ImportFixer(this.projectRoot);
    this.tagSentinel = new RefactorTagSentinel(this.projectRoot);
    this.joyHealer = new JoyZoningHealer(this.projectRoot);
  }

  /**
   * Start the high-throughput healing loop via broccoliq.process.
   */
  async start(): Promise<void> {
    if (this.isProcessing) return;
    const queue = await Core.getQueue();

    console.log('🌱 JoyZoning Healing Worker: INITIALIZED');

    this.isProcessing = true;

    // Process jobs with concurrency of 3 for refactoring safety
    queue.process(
      async (job) => {
        // BroccoliQ payload normalization
        const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;

        console.log(`🩹 Healing Job Received: [${job.id}] Type: ${payload.type}`);

        if (payload.type === 'SELF_HEAL') {
          const { oldPath, newPath } = payload.payload;

          console.log(`🛠️  Executing Healing: ${oldPath} → ${newPath}`);

          // 1. Resolve Imports (Project-wide)
          const result = await this.importFixer.fixImports(oldPath, newPath);
          console.log(`✅ Imports Resolved: ${result.updatedFiles.length} files aligned.`);

          await this.tagSentinel.updateTags(newPath);
          console.log('✅ Sovereign Tags Aligned.');
        }

        if (payload.type === JobType.JOY_ZONING_HEAL) {
          const resource = payload.payload.path;
          const owner = `worker-${Math.random().toString(36).substring(7)}`;

          console.log(`[JoyZoning] Pass 4 Verified Strategy Analysis: ${resource}`);

          // Phase 3: Distributed Atomic Lock (Durable Guarding)
          const locked = await LockManager.acquireLock(resource, owner);
          if (!locked) {
            console.log(
              `[JoyZoning] Resource Logic Locked: Skipping concurrent healing for ${resource}`,
            );
            return;
          }

          try {
            const result = await this.joyHealer.determineAction(payload.payload);
            console.log(`✅ [JoyZoning] Strategy Identified: ${result.strategy}`);

            if (result.step) {
              console.log(
                `🚀 [JoyZoning] Executing Durable Remediation: ${result.step.currentPath} → ${result.step.targetPath}`,
              );

              const moveEngine = new RefactorMoveEngine(this.projectRoot);

              // Step 1: Atomic Physical Move
              await moveEngine.move(result.step.currentPath, result.step.targetPath);

              // Step 2: Durable Tag Alignment
              await this.tagSentinel.updateTags(result.step.targetPath);

              // Step 3: Post-Heal Audit (Verification Loop)
              const postHealReport = await ArchitecturalGuardian.simulateGuard(
                result.step.targetPath,
                result.step.targetPath,
                { score: 100, violations: [] },
              );

              const isVerified = postHealReport.violations.length === 0;

              // Step 4: Metabolic Telemetry (Activity Accounting)
              await MetabolicRecorder.recordMetabolicEvent({
                linesAdded: 1,
                reads: 2, // Analysis + Audit
                writes: 1,
              });

              // Step 5: Persistent Audit Trail (Verified Outcome)
              await AuditRecorder.recordAudit(
                isVerified ? 'JOYZONING_VERIFIED' : 'JOYZONING_DRIFT',
                isVerified
                  ? `Remediation verified: ${result.step.file} reached zero-drift state.`
                  : `Remediation incomplete: ${result.step.file} has residual drift.`,
                {
                  from: result.step.currentPath,
                  to: result.step.targetPath,
                  violations: postHealReport.violations,
                },
              );

              // Step 6: Resolve Imports (Deferred Async via broccoliq)
              const queue = await Core.getQueue();
              await queue.enqueue({
                type: JobType.CODE_HEAL,
                payload: {
                  oldPath: result.step.currentPath,
                  newPath: result.step.targetPath,
                },
              });

              console.log(
                isVerified
                  ? '✅ [JoyZoning] VERIFIED REMEDIATION SUCCESSFUL.'
                  : '⚠️ [JoyZoning] REMEDIATION COMPLETE WITH RESIDUAL DRIFT.',
              );
            }
          } catch (err) {
            console.error(`❌ [JoyZoning] Durable Remediation FAILED: ${err}`);
            await AuditRecorder.recordAudit(
              'JOYZONING_HEAL_FAIL',
              `Durable move failed: ${resource}`,
              { error: String(err) },
            );
          } finally {
            // Phase 3: Absolute Lock Release
            await LockManager.releaseLock(resource, owner);
          }
        }
      },
      { concurrency: 3 },
    );
  }

  stop(): void {
    this.isProcessing = false;
    console.log('🛑 JoyZoning Healing Worker: STOPPED');
  }
}
