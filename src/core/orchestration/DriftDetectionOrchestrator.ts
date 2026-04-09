/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: Orchestrates axiomatic integrity verification and drift prevention
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 */

import * as crypto from 'node:crypto';
import { LogLevel } from '../../domain/logging/LogLevel';
import { JobType } from '../../domain/system/QueueProvider';
import type {
  DriftDetectionCriteria,
  DriftDetectionRecommendation,
} from '../../domain/task/DriftDetectionCriteria';
import {
  computeDriftRecommendation,
  createDefaultDriftCriteria,
  getDriftCriteriaForEnvironment,
} from '../../domain/task/DriftDetectionCriteria';
import type {
  AxiomProfile,
  CheckpointId,
  DriftVector,
  ImplementationSnapshot,
} from '../../domain/task/ImplementationSnapshot';
import {
  ComplianceState,
  IntegrityAxiom,
  calculateDriftDelta,
} from '../../domain/task/ImplementationSnapshot';
import {
  type CheckpointTrigger,
  CorrectionType,
  generateCheckpointId,
} from '../../domain/task/ImplementationSnapshot';
import type { ProjectIntegrityReport } from '../../domain/task/ProjectIntegrityReport';
import type { TaskEntity, TaskId } from '../../domain/task/TaskEntity';
import { TaskState } from '../../domain/task/TaskEntity';
import { MetabolicMonitor } from '../../infrastructure/monitoring/MetabolicMonitor';
import type { SovereignWorkerProxy } from '../../infrastructure/queue/SovereignWorkerProxy';
import type { CheckpointPersistenceAdapter } from '../../infrastructure/task/CheckpointPersistenceAdapter';
import type { SemanticIntegrityAnalyser } from '../../infrastructure/task/SemanticIntegrityAnalyser';
import type { TaskConsistencyValidator } from '../../infrastructure/task/TaskConsistencyValidator';
import { MetabolicBrain } from '../brain/MetabolicBrain';
import type { OperationalScheduler } from '../task/OperationalScheduler';
import type { SovereignSelector } from '../task/SovereignSelector';

/**
 * Coordinates axiomatic verification across task execution
 * Central orchestrator for compliance enforcement
 */
export class DriftDetectionOrchestrator {
  private checkpointAdapter: CheckpointPersistenceAdapter;
  private semanticAnalyzer: SemanticIntegrityAnalyser;
  private consistencyValidator: TaskConsistencyValidator;
  private entityManager: TaskEntityManager;

  private currentCheckpointId: CheckpointId | null = null;
  private currentAxiomProfile: AxiomProfile = {
    status: ComplianceState.CLEARED,
    failingAxioms: [],
    axiomResults: {
      [IntegrityAxiom.STRUCTURAL]: true,
      [IntegrityAxiom.RESONANCE]: true,
      [IntegrityAxiom.PURITY]: true,
      [IntegrityAxiom.STABILITY]: true,
      [IntegrityAxiom.INTERFACE_INTEGRITY]: true,
      [IntegrityAxiom.COGNITIVE_SIMPLICITY]: true,
    },
  };
  private lastCheckpointTimestamp: Date = new Date();
  private checkpointTokenCount: Map<string, number> = new Map();

  private selector: SovereignSelector;
  private scheduler: OperationalScheduler;
  private workerProxy?: SovereignWorkerProxy;
  private brain = new MetabolicBrain();
  private monitor = MetabolicMonitor.getInstance();

  constructor(
    persistenceAdapter: CheckpointPersistenceAdapter,
    semanticAnalyzer: SemanticIntegrityAnalyser,
    consistencyValidator: TaskConsistencyValidator,
    entityManager: TaskEntityManager,
    selector: SovereignSelector,
    scheduler: OperationalScheduler,
    workerProxy?: SovereignWorkerProxy,
  ) {
    this.checkpointAdapter = persistenceAdapter;
    this.semanticAnalyzer = semanticAnalyzer;
    this.consistencyValidator = consistencyValidator;
    this.entityManager = entityManager;
    this.selector = selector;
    this.scheduler = scheduler;
    this.workerProxy = workerProxy;

    this.currentCheckpointId = null;
    this.lastCheckpointTimestamp = new Date();
    this.checkpointTokenCount = new Map<string, number>();
  }

  /**
   * Initialize task with initial axiomatic verification
   */
  async initializeTask(taskMd: string, initialCheck: number): Promise<ImplementationSnapshot> {
    const taskValidation = await this.consistencyValidator.validateTask(taskMd);
    const currentTask = await this.entityManager.getCurrentTask();
    const taskId = currentTask?.id || this.entityManager.getTaskId(taskMd);

    if (!currentTask) {
      throw new Error('No current task found for initialization');
    }

    const bundle = await this.selector.generateProvenanceBundle(currentTask);
    const audit = this.selector.evaluate(bundle);

    if (!audit.pass) {
      this.log(LogLevel.ERROR, 'Sovereign Gate: Negative-Audit Failed', { reasons: audit.reasons });
      await this.entityManager.setCurrentTask({ ...currentTask, state: TaskState.FAILED });
      throw new Error(`Task rejected by Sovereign Selector: ${audit.reasons.join('; ')}`);
    }

    const readyTask = this.scheduler.transition(currentTask, TaskState.READY);
    await this.entityManager.setCurrentTask(readyTask);

    const snapshot = await this.createCheckpoint(taskMd, initialCheck, 'initialization', {
      validation: taskValidation,
      taskId,
    });

    this.monitor.setTaskId(taskId);
    this.monitor.recordVerification(true);
    this.currentCheckpointId = snapshot.checkpointId;
    this.currentAxiomProfile = snapshot.semanticHealth.axiomProfile;

    return snapshot;
  }

  /**
   * Periodic checkpoint persistence
   */
  async checkAndPersistCheckpoints(
    tokensProcessed: number,
  ): Promise<ImplementationSnapshot | null> {
    const criteria = this.getCurrentCriteria();

    if (
      !this.currentCheckpointId ||
      tokensProcessed - (this.checkpointTokenCount.get('current') || 0) >=
        criteria.checkpointInterval
    ) {
      const task = await this.entityManager.getCurrentTask();

      if (task) {
        const taskId = task.id ?? '';

        const updatedSnapshot = await this.createCheckpoint('periodic-sync', 1.0, 'demographic', {
          taskId,
        });

        this.checkpointTokenCount.set(String(taskId), 0);
        this.currentCheckpointId = updatedSnapshot.checkpointId;
        this.currentAxiomProfile = updatedSnapshot.semanticHealth.axiomProfile;

        this.log(LogLevel.INFO, `Checkpoint created at token ${tokensProcessed}`, {
          checkpointId: updatedSnapshot.checkpointId,
          status: updatedSnapshot.semanticHealth.axiomProfile.status,
        });

        return updatedSnapshot;
      }
    }

    return null;
  }

  /**
   * Create checkpoint with axiomatic verification
   */
  async createCheckpoint(
    markdownContent: string,
    validationScore: number,
    trigger: string,
    context: { validation?: any; taskId?: string } = {},
  ): Promise<ImplementationSnapshot> {
    const task = await this.entityManager.getCurrentTask();
    if (!task) throw new Error('No active task to checkpoint');

    let semanticIntegrity: any;

    if (this.workerProxy) {
      this.log(LogLevel.INFO, 'Offloading Axiomatic Verification to background worker');
      const result = await this.workerProxy.executeSingle<any, any>(JobType.SEMANTIC_SCORING, {
        content: markdownContent,
        tokenHashes: [],
      });
      if (result.success) {
        semanticIntegrity = result.payload;
      } else {
        semanticIntegrity = this.semanticAnalyzer.assessIntegrityAlignment(markdownContent, [], {
          objective: task.objective,
          layer: task.id?.includes('domain') ? 'domain' : 'unknown',
        });
      }
    } else {
      semanticIntegrity = this.semanticAnalyzer.assessIntegrityAlignment(markdownContent, [], {
        objective: task.objective,
        layer: task.id?.includes('domain') ? 'domain' : 'unknown',
      });
    }

    const isAxiomCompliant = semanticIntegrity.axiomProfile.status === ComplianceState.CLEARED;

    if (task.state === TaskState.SHADOW_SIM || task.state === TaskState.READY) {
      if (!isAxiomCompliant) {
        const firstViolation = semanticIntegrity.violations?.[0];
        const locationDetail = firstViolation?.location
          ? ` at Line ${firstViolation.location.lineNumber} (${firstViolation.location.codeSnippet})`
          : '';

        this.log(LogLevel.ERROR, `SRP Gate: Axiomatic Coverage Failed${locationDetail}`, {
          status: semanticIntegrity.axiomProfile.status,
          failingAxioms: semanticIntegrity.axiomProfile.failingAxioms,
        });
        throw new Error(
          `Axiomatic Compliance Failed: ${firstViolation?.message || 'Unknown violation'}. Refusing entry to SOVEREIGN_DOING.`,
        );
      }

      task.simAxiomProfile = semanticIntegrity.axiomProfile;
      const doingTask = this.scheduler.transition(task, TaskState.SOVEREIGN_DOING);
      await this.entityManager.setCurrentTask(doingTask);
    }

    const heartbeat = this.brain.calculateHeartbeat();
    const selfHealing = this.scheduler.evaluateSelfHealing(heartbeat);

    if (selfHealing.action === 'ROLLBACK' && this.currentCheckpointId) {
      this.log(LogLevel.WARN, 'Self-Healing TRIGGERED: Emergency Rollback', {
        reason: selfHealing.reason,
      });
      await this.restoreFromCheckpoint(this.currentCheckpointId, task.id || '');
      const retryTask = this.scheduler.transition(task, TaskState.SHADOW_SIM);
      await this.entityManager.setCurrentTask(retryTask);
    } else if (selfHealing.action === 'SUSPEND') {
      this.log(LogLevel.ERROR, 'Self-Healing TRIGGERED: Task Suspension', {
        reason: selfHealing.reason,
      });
      const failedTask = this.scheduler.transition(task, TaskState.FAILED);
      await this.entityManager.setCurrentTask(failedTask);
      throw new Error(`Task suspended by Self-Healing Protocol: ${selfHealing.reason}`);
    }

    const spec: any = {
      checkpointId:
        trigger === 'initialization' || trigger === 'demographic'
          ? generateCheckpointId()
          : this.currentCheckpointId || generateCheckpointId(),
      semanticHealth: semanticIntegrity,
      outputHash: markdownContent,
      outputSizeBytes: markdownContent.length,
      state: (await this.entityManager.getCurrentTask())?.state || TaskState.SOVEREIGN_DOING,
      tokensProcessed: 0,
      trigger: trigger as CheckpointTrigger,
      previousSnapshotId: this.currentCheckpointId,
      userConfirmationRequired: false,
    };

    const taskId = task.id || String(context.taskId ?? '');
    const snapshot = await this.checkpointAdapter.createCheckpoint(taskId, spec, []);

    await this.monitor.flushToDatabase(taskId);
    this.monitor.recordVerification(true);

    this.currentCheckpointId = snapshot.checkpointId;
    this.currentAxiomProfile = snapshot.semanticHealth.axiomProfile;

    return snapshot;
  }

  /**
   * Evaluate compliance state and provide recommendation
   */
  async evaluateDrift(taskMd: string): Promise<{
    recommendation: DriftDetectionRecommendation;
    snapshot: ImplementationSnapshot;
  }> {
    const criteria = this.getCurrentCriteria();
    const recommendation = computeDriftRecommendation(
      this.currentAxiomProfile,
      criteria,
      TaskState.SOVEREIGN_DOING,
    );

    const emojiRating = this.getEmojiForAction(recommendation.correctiveAction);

    if (this.currentAxiomProfile.status !== ComplianceState.CLEARED) {
      const snapshot = await this.createCheckpoint(taskMd, 1.0, 'demographic', {
        taskId: (await this.entityManager.getCurrentTask())?.id,
      });

      const firstViolation = snapshot.semanticHealth.violations?.[0];
      const detailedMsg = firstViolation?.location
        ? `${recommendation.explanation} (Line ${firstViolation.location.lineNumber}: ${firstViolation.location.codeSnippet})`
        : recommendation.explanation;

      this.log(LogLevel.WARN, `${emojiRating} Axiomatic Status: ${detailedMsg}`, {
        status: this.currentAxiomProfile.status,
        mitigation: recommendation.correctiveAction,
      });

      return {
        recommendation,
        snapshot,
      };
    }

    this.log(LogLevel.INFO, `${emojiRating} Axiomatic Status: ${recommendation.explanation}`, {
      status: this.currentAxiomProfile.status,
    });

    return {
      recommendation,
      snapshot: await this.createCheckpoint(taskMd, 1.0, 'demographic', {
        taskId: (await this.entityManager.getCurrentTask())?.id,
      }),
    };
  }

  /**
   * Triggers a project-wide architectural integrity audit (Axiom 3.0)
   */
  async runSovereignAudit(): Promise<ProjectIntegrityReport> {
    this.log(LogLevel.INFO, 'Initiating Project-Wide Sovereign Audit (Axiom 3.0)');
    const report = await this.semanticAnalyzer.runProjectAudit('./src');

    this.log(LogLevel.WARN, 'Sovereign Audit Complete', {
      totalFiles: report.totalFilesScanned,
      blockedCount: report.blockedFilesCount,
    });

    return report;
  }

  /**
   * Restore state from checkpoint
   */
  async restoreFromCheckpoint(
    checkpointId: CheckpointId,
    taskId: string,
  ): Promise<ImplementationSnapshot> {
    const snapshot = await this.checkpointAdapter.restoreCheckpoint(taskId, checkpointId);

    this.currentCheckpointId = checkpointId;
    this.currentAxiomProfile = snapshot.semanticHealth.axiomProfile;
    this.lastCheckpointTimestamp = snapshot.timestamp;

    this.log(LogLevel.INFO, `State restored from checkpoint ${checkpointId}`, {
      checkpointId,
      status: snapshot.semanticHealth.axiomProfile.status,
    });

    return snapshot;
  }

  /**
   * Get axiomatic assessment between two checkpoints
   */
  async compareCheckpoints(
    checkpointId1: CheckpointId,
    checkpointId2: CheckpointId,
  ): Promise<{
    delta: DriftVector;
    vector: any;
    organismality: number;
  }> {
    const taskId = 'active-task';
    const checkpoints = await this.checkpointAdapter.getLastCheckpoints(taskId, 2);

    if (checkpoints.length < 2) {
      throw new Error('Need at least 2 checkpoints to compare');
    }

    const earlier = checkpoints[1];
    const later = checkpoints[0];

    if (!earlier || !later) {
      throw new Error('Checkpoints missing during comparison');
    }

    const isAxiomCompliant = later.semanticHealth.axiomProfile.status === ComplianceState.CLEARED;
    const topicDivergence = isAxiomCompliant ? 0.0 : 1.0;
    const delta = calculateDriftDelta(earlier, later);

    const vector = {
      axiomStatus: later.semanticHealth.axiomProfile.status,
      topicDivergence,
      scopeCreep: delta.scopeCreep,
    };

    const organismality = Math.max(delta.topicDivergence, delta.scopeCreep);

    return { delta, vector, organismality };
  }

  /**
   * Get monitoring metrics
   */
  async getMonitoringMetrics(): Promise<{
    checkpointStats: any;
    driftHistory: any[];
    dataAge: any;
  }> {
    const checkpointStats = await this.checkpointAdapter.getCheckpointAgeMetrics();
    const tasks = await this.checkpointAdapter.listTasks(100);

    const driftHistory: any[] = tasks.map((task) => ({
      task_id: task.task_id,
      title: task.title,
      updated_at: task.updated_at,
    }));

    return {
      checkpointStats,
      driftHistory,
      dataAge: {
        oldestSnapshot: checkpointStats.oldestSnapshot,
        newestSnapshot: checkpointStats.newestSnapshot,
        totalTasks: checkpointStats.totalTasks,
        totalCheckpoints: checkpointStats.totalCheckpoints,
      },
    };
  }

  private getCurrentCriteria(): DriftDetectionCriteria {
    const env = (process.env.NODE_ENV as any) || 'development';
    return (
      this.cachedCriteria[env] || this.cachedCriteria.development || createDefaultDriftCriteria()
    );
  }

  private cachedCriteria: Record<string, DriftDetectionCriteria> = {
    development: {
      checkpointInterval: 500,
      autoRestoreOnCriticalDrift: true,
      maxCheckpointCacheSize: 100,
      logDriftPredictions: true,
      enableDriftPrediction: true,
      enabledAxioms: [IntegrityAxiom.STRUCTURAL, IntegrityAxiom.RESONANCE],
    },
    staging: {
      checkpointInterval: 1000,
      autoRestoreOnCriticalDrift: true,
      maxCheckpointCacheSize: 50,
      logDriftPredictions: false,
      enableDriftPrediction: true,
      enabledAxioms: [IntegrityAxiom.STRUCTURAL, IntegrityAxiom.RESONANCE, IntegrityAxiom.PURITY],
    },
    production: {
      checkpointInterval: 2000,
      autoRestoreOnCriticalDrift: true,
      maxCheckpointCacheSize: 30,
      logDriftPredictions: false,
      enableDriftPrediction: false,
      enabledAxioms: [
        IntegrityAxiom.STRUCTURAL,
        IntegrityAxiom.RESONANCE,
        IntegrityAxiom.PURITY,
        IntegrityAxiom.STABILITY,
      ],
    },
  };

  private log(level: LogLevel, message: string, data?: any): void {
    const levelPrefix = `[${level}] [DriftDetectionOrchestrator]`;
    const dataString = data ? ` | ${JSON.stringify(data)}` : '';
    console.log(`${levelPrefix} ${message}${dataString}`);
  }

  private getEmojiForAction(action: string): string {
    if (action === CorrectionType.DRIFT_CORRECTION) return '✅';
    if (action === CorrectionType.PAUSE_FOR_REVIEW) return '⚠️';
    return '❓';
  }
}

/**
 * Entity manager for current task operations
 */
export class TaskEntityManager {
  private currentTask: TaskEntity | null = null;
  constructor(private persistenceAdapter: CheckpointPersistenceAdapter) {}

  async setCurrentTask(task: TaskEntity): Promise<void> {
    await this.persistenceAdapter.persistTask(task);
    this.currentTask = task;
  }

  async getCurrentTask(): Promise<TaskEntity | null> {
    if (!this.currentTask) {
      this.currentTask = await this.persistenceAdapter.getTask('');
    }
    return this.currentTask;
  }

  getTaskId(markdown: string): string {
    return `task-${crypto.createHash('md5').update(markdown).digest('hex').slice(0, 8)}`;
  }
}
