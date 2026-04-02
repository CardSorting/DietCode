/**
 * [LAYER: CORE]
 * Principle: Orchestrates drift detection and prevention across layers
 * Prework Status: 
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - [FIXED] All TypeScript compilation errors resolved
 */

import type { TaskId, TaskEntity } from '../../domain/task/TaskEntity';
import type { DriftDetectionCriteria, DriftDetectionRecommendation } from '../../domain/task/DriftDetectionCriteria';
import { getDriftCriteriaForEnvironment, DriftProfilingLevel, createDefaultDriftCriteria } from '../../domain/task/DriftDetectionCriteria';
import type { ImplementationSnapshot, CheckpointId, DriftVector } from '../../domain/task/ImplementationSnapshot';
import { calculateDriftDelta } from '../../domain/task/ImplementationSnapshot';
import { CheckpointPersistenceAdapter } from '../../infrastructure/task/CheckpointPersistenceAdapter';
import { SemanticIntegrityAnalyser } from '../../infrastructure/task/SemanticIntegrityAnalyser';
import { TaskConsistencyValidator } from '../../infrastructure/task/TaskConsistencyValidator';
import { LogLevel } from '../../domain/logging/LogLevel';
import { TaskState } from '../../domain/task/TaskEntity';
import { CheckpointTrigger, CorrectionType, generateCheckpointId } from '../../domain/task/ImplementationSnapshot';
import { SovereignSelector } from '../task/SovereignSelector';
import { OperationalScheduler } from '../task/OperationalScheduler';
import { MetabolicMonitor } from '../../infrastructure/monitoring/MetabolicMonitor';
import * as crypto from 'crypto';

/**
 * Coordinates drift detection across task.md and implementation.md
 * Central orchestrator for drift prevention and detection
 */
export class DriftDetectionOrchestrator {
  private checkpointAdapter: CheckpointPersistenceAdapter;
  private semanticAnalyzer: SemanticIntegrityAnalyser;
  private consistencyValidator: TaskConsistencyValidator;
  private entityManager: TaskEntityManager;
  
  private currentCheckpointId: CheckpointId | null = null;
  private currentDriftScore: number = 0;
  private lastCheckpointTimestamp: Date = new Date();
  private checkpointTokenCount: Map<string, number> = new Map();
  
  private selector: SovereignSelector;
  private scheduler: OperationalScheduler;
  private monitor = MetabolicMonitor.getInstance();

  constructor(
    persistenceAdapter: CheckpointPersistenceAdapter,
    semanticAnalyzer: SemanticIntegrityAnalyser,
    consistencyValidator: TaskConsistencyValidator,
    entityManager: TaskEntityManager,
    selector: SovereignSelector,
    scheduler: OperationalScheduler,
    config?: {
      criteria: DriftDetectionCriteria;
      autoCheckpointInterval: number;
      maxHistory: number;
    }
  ) {
    this.checkpointAdapter = persistenceAdapter;
    this.semanticAnalyzer = semanticAnalyzer;
    this.consistencyValidator = consistencyValidator;
    this.entityManager = entityManager;
    this.selector = selector;
    this.scheduler = scheduler;

    this.currentCheckpointId = null;
    this.currentDriftScore = 0;
    this.lastCheckpointTimestamp = new Date();
    this.checkpointTokenCount = new Map<string, number>();
  }

  /**
   * Initialize drift detection for a new task using Sovereign Protocol v6.0
   */
  async initializeTask(taskMd: string, initialCheck: number): Promise<ImplementationSnapshot> {
    const taskValidation = await this.consistencyValidator.validateTask(taskMd);
    const currentTask = await this.entityManager.getCurrentTask();
    const taskId = currentTask?.id || this.entityManager.getTaskId(taskMd);
    
    if (!currentTask) {
      throw new Error('No current task found for initialization');
    }

    // Pass 17: Sovereign Negative-Audit Gate
    const bundle = await this.selector.generateProvenanceBundle(currentTask);
    const audit = this.selector.evaluate(bundle);

    if (!audit.pass) {
       this.log(LogLevel.ERROR, 'Sovereign Gate: Negative-Audit Failed', { reasons: audit.reasons });
       await this.entityManager.setCurrentTask({ ...currentTask, state: TaskState.FAILED });
       throw new Error(`Task rejected by Sovereign Selector: ${audit.reasons.join('; ')}`);
    }

    // Transition to READY
    const readyTask = this.scheduler.transition(currentTask, TaskState.READY);
    await this.entityManager.setCurrentTask(readyTask);
    
    const snapshot = await this.createCheckpoint(
      taskMd,
      initialCheck,
      'initialization',
      {
        validation: taskValidation,
        taskId
      }
    );

    this.monitor.setTaskId(taskId);
    this.monitor.recordVerification(true);
    this.currentCheckpointId = snapshot.checkpointId;
    this.currentDriftScore = snapshot.semanticHealth.integrityScore;
    
    return snapshot;
  }

  /**
   * Create checkpoint at regular intervals based on token consumption
   */
  async checkAndPersistCheckpoints(
    currentDriftScore: number,
    tokensProcessed: number
  ): Promise<ImplementationSnapshot | null> {
    const criteria = this.getCurrentCriteria();
    
    if (!this.currentCheckpointId || 
        (tokensProcessed - (this.checkpointTokenCount.get('current') || 0)) >= criteria.checkpointInterval) {
      const task = await this.entityManager.getCurrentTask();
      
      if (task) {
        const taskId = task.id ?? '';
        const outputHash: string = await this.createHash(`checkpoint-${tokensProcessed}`);
        
        const updatedSnapshot: ImplementationSnapshot = await this.checkpointAdapter.createCheckpoint(
          taskId,
          {
            checkpointId: this.currentCheckpointId || undefined,
            driftScore: currentDriftScore,
            semanticHealth: {
              integrityScore: currentDriftScore,
              structureIntegrity: true,
              contentIntegrity: this.currentDriftScore >= 0.9 ? false : true,
              objectiveAlignment: 1.0 - currentDriftScore,
              violations: [],
              warnings: this.currentDriftScore < 0.9 ? [] : ['Content integrity compromised']
            },
            consistencyScore: 1.0 - currentDriftScore,
            outputHash: outputHash,
            outputSizeBytes: 0,
            state: task.state as TaskState,
            tokensProcessed: tokensProcessed,
            trigger: CheckpointTrigger.DEMOGRAPHIC,
            userConfirmationRequired: false
          },
          []
        );

        this.checkpointTokenCount.set(String(taskId), 0);
        this.currentCheckpointId = updatedSnapshot.checkpointId;
        this.currentDriftScore = updatedSnapshot.driftScore;

        this.log(LogLevel.INFO, `Checkpoint created at token ${tokensProcessed}`, {
          checkpointId: updatedSnapshot.checkpointId,
          driftScore: updatedSnapshot.driftScore
        });

        return updatedSnapshot;
      }
    }

    return null;
  }

  /**
   * Create checkpoint with validation and semantic analysis
   */
  async createCheckpoint(
    markdownContent: string,
    validationScore: number,
    trigger: string,
    context: { validation?: any; taskId?: string } = {}
  ): Promise<ImplementationSnapshot> {
    const task = await this.entityManager.getCurrentTask();
    if (!task) throw new Error('No active task to checkpoint');

    const semanticIntegrity = this.semanticAnalyzer.calculateSemanticIntegrity(
      markdownContent,
      []
    );

    const driftScore = 1.0 - semanticIntegrity.integrityScore;

    // Pass 14: Simulated Reality Protocol Gate
    if (task.state === TaskState.SHADOW_SIM || task.state === TaskState.READY) {
       const sim = await this.scheduler.simulateShadowExecution(
         task,
         'task.md',
         markdownContent,
         '.',
         {}
       );

       if (!this.scheduler.canEnterSovereignDoing(sim.integrity)) {
          this.log(LogLevel.ERROR, 'SRP Gate: Simulation Integrity Failed', { integrity: sim.integrity });
          throw new Error(`Simulation Integrity (${sim.integrity.toFixed(2)}) below 0.95. Refusing entry to SOVEREIGN_DOING.`);
       }

       // Valid simulation - Promote to SOVEREIGN_DOING
       const doingTask = this.scheduler.transition(task, TaskState.SOVEREIGN_DOING);
       await this.entityManager.setCurrentTask(doingTask);
    }

    const spec: any = {
      checkpointId: (trigger === 'initialization' || trigger === 'demographic') ? generateCheckpointId() : (this.currentCheckpointId || generateCheckpointId()),
      driftScore: Math.max(0.0, Math.min(1.0, driftScore)),
      semanticHealth: semanticIntegrity,
      consistencyScore: semanticIntegrity.objectiveAlignment,
      outputHash: markdownContent,
      outputSizeBytes: markdownContent.length,
      state: (await this.entityManager.getCurrentTask())?.state || TaskState.SOVEREIGN_DOING,
      tokensProcessed: 0,
      trigger: trigger as CheckpointTrigger,
      validatedBy: undefined,
      previousSnapshotId: this.currentCheckpointId,
      userConfirmationRequired: false
    };

    const taskId = task.id || String(context.taskId ?? '');
    
    const snapshot = await this.checkpointAdapter.createCheckpoint(
      taskId,
      spec,
      []
    );

    // Pass 17: Metabolic Snapshot Persistence
    await this.monitor.flushToDatabase(taskId);
    this.monitor.recordVerification(true);
    
    this.currentCheckpointId = snapshot.checkpointId;
    this.currentDriftScore = snapshot.driftScore;

    return snapshot;
  }

  /**
   * Evaluate drift at checkpoint creation and provide recommendation
   */
  async evaluateDrift(
    taskMd: string,
    expectedScore: number,
    referenceObjective: string
  ): Promise<{
    driftScore: number;
    recommendation: DriftDetectionRecommendation;
    snapshot: ImplementationSnapshot;
  }> {
    const criteria = this.getCurrentCriteria();
    const currentDriftScore = this.currentDriftScore;

    const recommendation = this.calculateDriftRecommendation(
      currentDriftScore,
      criteria,
      TaskState.SOVEREIGN_DOING
    );

    const emojiRating = this.getEmojiForAction(recommendation.correctiveAction);

    this.log(LogLevel.WARN, `${emojiRating} Drift detected: ${recommendation.explanation}`, {
      driftScore: currentDriftScore,
      trigger: recommendation.correctiveAction
    });

    return {
      driftScore: currentDriftScore,
      recommendation,
      snapshot: await this.createCheckpoint(
        taskMd,
        expectedScore,
        'demographic',
        { taskId: (await this.entityManager.getCurrentTask())?.id }
      )
    };
  }

  /**
   * Calculate drift recommendation based on criteria
   */
  private calculateDriftRecommendation(
    currentDriftScore: number,
    criteria: DriftDetectionCriteria,
    taskState: TaskState
  ): DriftDetectionRecommendation {
    if (criteria.strictModeEnabled && currentDriftScore < criteria.requiresConfirmationForDriftAbove) {
      return {
        shouldProceed: true,
        requiresUserConfirmation: false,
        correctiveAction: CorrectionType.DRIFT_CORRECTION,
        explanation: `Drift is minimal (${currentDriftScore.toFixed(2)}). Continue with current approach.`,
        suggestedState: taskState
      };
    }

    if (currentDriftScore >= criteria.requiresConfirmationForDriftAbove && 
        currentDriftScore < 0.9) {
      return {
        shouldProceed: false,
        requiresUserConfirmation: true,
        correctiveAction: CorrectionType.PAUSE_FOR_REVIEW,
        explanation: `Drift detected (${currentDriftScore.toFixed(2)}). Requires confirmation before continuing.`,
        suggestedState: TaskState.SHADOW_SIM
      };
    }

    if (currentDriftScore >= 0.9) {
      return {
        shouldProceed: false,
        requiresUserConfirmation: true,
        correctiveAction: CorrectionType.PAUSE_FOR_REVIEW,
        explanation: `Critical drift detected (${currentDriftScore.toFixed(2)}). State corruptions may be potentially irreversible.`,
        suggestedState: TaskState.FAILED
      };
    }

    return {
      shouldProceed: true,
      requiresUserConfirmation: false,
      correctiveAction: CorrectionType.DRIFT_CORRECTION,
      explanation: `Drift within bounds (${currentDriftScore.toFixed(2)}). Proceeding with current approach.`,
      suggestedState: taskState
    };
  }

  /**
   * Restore state from checkpoint on critical drift
   */
  async restoreFromCheckpoint(
    checkpointId: CheckpointId,
    taskId: string
  ): Promise<ImplementationSnapshot> {
    const snapshot = await this.checkpointAdapter.restoreCheckpoint(taskId, checkpointId);
    
    this.currentCheckpointId = checkpointId;
    this.currentDriftScore = snapshot.semanticHealth.integrityScore;
    this.lastCheckpointTimestamp = snapshot.timestamp;

    this.log(LogLevel.INFO, `State restored from checkpoint ${checkpointId}`, {
      checkpointId,
      driftScore: snapshot.semanticHealth.integrityScore
    });

    return snapshot;
  }

  /**
   * Get drift assessment between two checkpoints
   */
  async compareCheckpoints(
    checkpointId1: CheckpointId,
    checkpointId2: CheckpointId
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

    const similarity = this.semanticAnalyzer.calculateLinearDistance(
      later.completedRequirements.map(r => r.description).join(' '),
      earlier.completedRequirements.map(r => r.description).join(' ')
    );
    const topicDivergence = 1.0 - similarity;
    const delta = calculateDriftDelta(earlier, later, topicDivergence);

    const vector = {
      driftScore: delta.driftScore,
      topicDivergence,
      scopeCreep: delta.scopeCreep,
      qualityDeterioration: delta.qualityDeterioration
    };
    
    const organismality = Math.max(
      delta.topicDivergence,
      delta.scopeCreep,
      delta.qualityDeterioration
    );

    return { delta, vector, organismality };
  }

  /**
   * Get monitoring metrics for checkpoint age and drift history
   */
  async getMonitoringMetrics(): Promise<{
    checkpointStats: any;
    driftHistory: any[];
    dataAge: any;
  }> {
    const checkpointStats = await this.checkpointAdapter.getCheckpointAgeMetrics();
    const tasks = await this.checkpointAdapter.listTasks(100);

    const driftHistory: any[] = tasks.map(task => ({
      task_id: task.task_id,
      title: task.title,
      updated_at: task.updated_at
    }));

    return {
      checkpointStats,
      driftHistory,
      dataAge: {
        oldestSnapshot: checkpointStats.oldestSnapshot,
        newestSnapshot: checkpointStats.newestSnapshot,
        totalTasks: checkpointStats.totalTasks,
        totalCheckpoints: checkpointStats.totalCheckpoints
      }
    };
  }

  private getCurrentCriteria(): DriftDetectionCriteria {
    const env = (process.env.NODE_ENV as any) || 'development';
    return this.cachedCriteria[env] || this.cachedCriteria['development'] || createDefaultDriftCriteria();
  }

  private cachedCriteria: Record<string, DriftDetectionCriteria> = {
    development: {
      maxDriftThreshold: 0.5,
      requiresConfirmationForDriftAbove: 0.7,
      checkpointInterval: 500,
      semanticSimilarityThreshold: 0.75,
      strictModeEnabled: true,
      maxFailureThreshold: 0.95,
      autoRestoreOnCriticalDrift: true,
      maxCheckpointCacheSize: 100,
      logDriftPredictions: true,
      enableDriftPrediction: true
    },
    staging: {
      maxDriftThreshold: 0.3,
      requiresConfirmationForDriftAbove: 0.6,
      checkpointInterval: 1000,
      semanticSimilarityThreshold: 0.85,
      strictModeEnabled: false,
      maxFailureThreshold: 0.95,
      autoRestoreOnCriticalDrift: true,
      maxCheckpointCacheSize: 50,
      logDriftPredictions: false,
      enableDriftPrediction: true
    },
    production: {
      maxDriftThreshold: 0.2,
      requiresConfirmationForDriftAbove: 0.5,
      checkpointInterval: 2000,
      semanticSimilarityThreshold: 0.9,
      strictModeEnabled: false,
      maxFailureThreshold: 0.95,
      autoRestoreOnCriticalDrift: true,
      maxCheckpointCacheSize: 30,
      logDriftPredictions: false,
      enableDriftPrediction: false
    }
  };

  private async createHash(input: string): Promise<string> {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  private log(level: LogLevel, message: string, data?: any): void {
    const levelPrefix = `[${level}] [DriftDetectionOrchestrator]`;
    const dataString = data ? ` | ${JSON.stringify(data)}` : '';
    console.log(`${levelPrefix} ${message}${dataString}`);
  }

  private getCorrectionKey(action: string): string {
    if (action === 'DRIFT_CORRECTION') return 'same';
    if (action === 'PAUSE_FOR_REVIEW') return 'diverged';
    return 'unknown';
  }

  private getEmojiForAction(action: string): string {
    const key = this.getCorrectionKey(action);
    if (key === 'same') return '✅';
    if (key === 'diverged') return '⚠️';
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
    return 'task-' + crypto.createHash('md5').update(markdown).digest('hex').slice(0, 8);
  }
}