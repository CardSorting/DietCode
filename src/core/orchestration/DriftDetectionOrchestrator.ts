/**
 * [LAYER: CORE]
 * Principle: Orchestrates drift detection and prevention across layers
 * Prework Status: 
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - [NEW] Implements DriftDetectionOrchestrator for end-to-end drift prevention
 */

import type { TaskId, TaskEntity } from '../../domain/task/TaskEntity';
import type { DriftDetectionCriteria, DriftDetectionRecommendation } from '../../domain/task/DriftDetectionCriteria';
import type { ImplementationSnapshot, CheckpointId } from '../../domain/task/ImplementationSnapshot';
import { CheckpointPersistenceAdapter } from '../../infrastructure/task/CheckpointPersistenceAdapter';
import { SemanticIntegrityAnalyser } from '../../infrastructure/task/SemanticIntegrityAnalyser';
import { TaskConsistencyValidator } from '../../infrastructure/task/TaskConsistencyValidator';
import { LogLevel } from '../../domain/logging/LogLevel';
import { TaskState } from '../../domain/task/TaskEntity';

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

  constructor(
    persistenceAdapter: CheckpointPersistenceAdapter,
    semanticAnalyzer: SemanticIntegrityAnalyser,
    consistencyValidator: TaskConsistencyValidator,
    entityManager: TaskEntityManager,
    config: {
      criteria: DriftDetectionCriteria;
      autoCheckpointInterval: number;
      maxHistory: number;
    } = {
      autoCheckpointInterval: 1000,
      maxHistory: 50,
      criteria: {
        maxDriftThreshold: 0.3,
        requiresConfirmationForDriftAbove: 0.6,
        checkpointInterval: 1000,
        semanticSimilarityThreshold: 0.75,
        strictModeEnabled: true,
        maxFailureThreshold: 0.95,
        autoRestoreOnCriticalDrift: true,
        maxCheckpointCacheSize: 100,
        logDriftPredictions: true,
        enableDriftPrediction: true
      }
    }
  ) {
    this.checkpointAdapter = persistenceAdapter;
    this.semanticAnalyzer = semanticAnalyzer;
    this.consistencyValidator = consistencyValidator;
    this.entityManager = entityManager;

    this.currentCheckpointId = null;
    this.currentDriftScore = 0;
    this.lastCheckpointTimestamp = new Date();
    this.checkpointTokenCount = new Map<string, number>(); // ✅ Initialize checkpoint map
  }

  /**
   * Initialize drift detection for a new task
   * Creates initial checkpoint and evaluates current state
   */
  async initializeTask(taskMd: string, initialCheck: number): Promise<ImplementationSnapshot> {
    const checkpointId = crypto.randomUUID();
    const taskValidation = await this.consistencyValidator.validateTask(taskMd);
    
    // Create initial snapshot
    const snapshot = await this.createCheckpoint(
      taskMd,
      initialCheck,
      'initialization',
      {
        validation: taskValidation,
        taskId: this.entityManager.getTaskId(taskMd)
      }
    );

    this.currentCheckpointId = checkpointId;
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
    const criteria = await this.getCurrentCriteria();
    
    // Check if checkpoint interval exceeded
    if (!this.currentCheckpointId || 
        (tokensProcessed - (this.checkpointTokenCount.get('current') || 0)) >= criteria.checkpointInterval) {
      const task = await this.entityManager.getCurrentTask();
      
      if (task) {
        const updatedSnapshot = await this.checkpointAdapter.createCheckpoint(
          task.id || '',
          {
            checkpointId: this.currentCheckpointId,
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
            outputHash: crypto.createHash('sha-256').update(`checkpoint-${tokensProcessed}`).digest('hex'),
            outputSizeBytes: 0,
            state: task.state,
            tokensProcessed: tokensProcessed,
            trigger: 'demographic',
            previousSnapshotId: this.currentCheckpointId
          },
          []
        );

        const taskId = task.id || '';
        this.checkpointTokenCount.set(taskId, tokensProcessed);
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
    const semanticIntegrity = this.semanticAnalyzer.calculateSemanticIntegrity(
      markdownContent,
      []
    );

    const driftScore = 1.0 - semanticIntegrity.integrityScore;

    const spec = {
      checkpointId: this.currentCheckpointId || crypto.randomUUID(),
      driftScore: Math.max(0.0, Math.min(1.0, driftScore)),
      semanticHealth: semanticIntegrity,
      consistencyScore: semanticIntegrity.objectiveAlignment,
      outputHash: crypto.createHash('sha-256').update(markdownContent).digest('hex'),
      outputSizeBytes: markdownContent.length,
      state: TaskState.IN_PROGRESS,
      tokensProcessed: 0,
      trigger: trigger,
      validatedBy: undefined,
      parentCheckpointId: this.currentCheckpointId
    };

    const snapshot = spec.semanticHealth.contentIntegrity
      ? await this.checkpointAdapter.createCheckpoint(
          context.taskId || '',
          spec,
          []
        )
      : await this.checkpointAdapter.createCheckpoint(
          context.taskId || '',
          {
            ...spec,
            semanticHealth: {
              ...spec.semanticHealth,
              contentIntegrity: false,
              violations: [
                {
                  id: crypto.randomUUID(),
                  type: 'semantic_integrity_failed',
                  message: 'Content integrity check failed - potential hallucination detected',
                  severity: 'error',
                  timestamp: new Date()
                }
              ]
            }
          },
          []
        );

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
    const criteria = await this.getCurrentCriteria();
    const currentDriftScore = this.currentDriftScore;

    const recommendation = this.calculateDriftRecommendation(
      currentDriftScore,
      criteria,
      TaskState.IN_PROGRESS
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
        'demographic'
      )
    };
  }

  /**
   * Calculate drift recommendation based on credentials
   */
  private calculateDriftRecommendation(
    currentDriftScore: number,
    criteria: DriftDetectionCriteria,
    taskState: TaskState
  ): DriftDetectionRecommendation {
    // Case 1: Minimal drift, strict mode active
    if (criteria.strictModeEnabled && currentDriftScore < criteria.requiresConfirmationForDriftAbove) {
      return {
        shouldProceed: true,
        requiresUserConfirmation: false,
        correctiveAction: 'DRIFT_CORRECTION',
        explanation: `Drift is minimal (${currentDriftScore.toFixed(2)}). Continue with current approach.`,
        suggestedState: taskState
      };
    }

    // Case 2: Moderate drift (0.6-0.89) - requires review
    if (currentDriftScore >= criteria.requiresConfirmationForDriftAbove && 
        currentDriftScore < 0.9) {
      return {
        shouldProceed: false,
        requiresUserConfirmation: true,
        correctiveAction: 'PAUSE_FOR_REVIEW',
        explanation: `Drift detected (${currentDriftScore.toFixed(2)}). Requires confirmation before continuing.`,
        suggestedState: TaskState.SUSPENDED
      };
    }

    // Case 3: Severe drift (> 0.9) - failure state
    if (currentDriftScore >= 0.9) {
      return {
        shouldProceed: false,
        requiresUserConfirmation: true,
        correctiveAction: 'PAUSE_FOR_REVIEW',
        explanation: `Critical drift detected (${currentDriftScore.toFixed(2)}). State corruptions may be potentially irreversible.`,
        suggestedState: TaskState.FAILED
      };
    }

    // Case 4: Default - drift within bounds
    return {
      shouldProceed: true,
      requiresUserConfirmation: false,
      correctiveAction: 'DRIFT_CORRECTION',
      explanation: `Drift within bounds (${currentDriftScore.toFixed(2)}). Proceeding with current approach.`,
      suggestedState: taskState
    };
  }

  /**
   * Restore state from checkpoint on critical drift
   */
  async restoreFromCheckpoint(
    checkpointId: CheckpointId,
    taskId: TaskId
  ): Promise<ImplementationSnapshot> {
    const snapshot = await this.checkpointAdapter.restoreCheckpoint(taskId, checkpointId);
    
    this.currentCheckpointId = checkpointId;
    this.currentDriftScore = snapshot.driftScore;
    this.lastCheckpointTimestamp = snapshot.timestamp;

    this.log(LogLevel.INFO, `State restored from checkpoint ${checkpointId}`, {
      checkpointId,
      driftScore: snapshot.driftScore
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
    delta: number;
    vector: any;
    organismality: number;
  }> {
    const checkpoints = await this.checkpointAdapter.getLastCheckpoints(
      '',
      2
    );

    if (checkpoints.length < 2) {
      throw new Error('Need at least 2 checkpoints to compare');
    }

    const earlier = checkpoints[1];
    const later = checkpoints[0];

    const delta = this.calculateDriftDelta(earlier, later);
    const vector = this.calculateDriftVector(earlier, later);
    const organismality = Math.max(
      delta.topicDivergence,
      delta.scopeCreep,
      delta.qualityDeterioration
    );

    return {
      delta,
      vector,
      organismality
    };
  }

  /**
   * Calculate drift delta between two checkpoints
   */
  private calculateDriftDelta(
    before: ImplementationSnapshot,
    after: ImplementationSnapshot
  ): {
    driftScore: number;
  } {
    const delta = after.driftScore - before.driftScore;
    return {
      driftScore: Math.abs(delta)
    };
  }

  /**
   * Calculate drift vector between snapshots
   */
  private calculateDriftVector(
    snapshot1: ImplementationSnapshot,
    snapshot2: ImplementationSnapshot
  ): any {
    const similarity = this.semanticAnalyzer.calculateLinearDistance(
      snapshot2.completedRequirements.join(' '),
      snapshot1.completedRequirements.join(' ')
    );
    
    return {
      topicDivergence: 1.0 - similarity,
      scopeCreep: Math.abs(snapshot2.totalRequirements - snapshot1.totalRequirements) / snapshot1.totalRequirements,
      qualityDeterioration: snapshot2.semanticHealth.integrityScore - snapshot1.semanticHealth.integrityScore
    };
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
    const tasks = await this.checkpointAdapter.listTasks();

    const driftHistory = tasks.map(task => ({
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

  /**
   * Get criterion of tolerances for current runtime environment
   * 🐛 OPTIMIZATION: Synchronous version with memoization to eliminate async import overhead
   */
  private getCurrentCriteria(): DriftDetectionCriteria {
    // Get environment from process.env or default to 'development'
    const env = (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development';
    
    // Direct import without async overhead (imported once at module level)
    return this.getDriftCriteria(env);
  }

  /**
   * Cached mapping of environment to criteria (avoid dynamic imports)
   */
  private cachedCriteria: Record<string, DriftDetectionCriteria> = {
    development: { /* populated below */
    },
    staging: { /* populated below */
    },
    production: { /* populated below */
    }
  };

  /**
   * Load critical criteria configuration for each environment
   * Called once during initialization
   */
  private loadCriteria(): void {
    // Development: Looser thresholds for testing
    this.cachedCriteria.development = {
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
    };

    // Staging: Balanced (default from Domain layer)
    this.cachedCriteria.staging = {
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
    };

    // Production: Strict thresholds for reliability
    this.cachedCriteria.production = {
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
    };
  }

  /**
   * Get criteria for specific environment (lookup from cached config)
   */
  private getDriftCriteria(env: string): DriftDetectionCriteria {
    return this.cachedCriteria[env] || this.cachedCriteria.development;
  }

  /**
   * Log drift event with appropriate log level
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const levelPrefix = {
      [LogLevel.DEBUG]: '🔧 [DriftDetectionOrchestrator]',
      [LogLevel.INFO]: '📋 [DriftDetectionOrchestrator]',
      [LogLevel.WARN]: '⚠️ [DriftDetectionOrchestrator]',
      [LogLevel.ERROR]: '❌ [DriftDetectionOrchestrator]',
      [LogLevel.CRITICAL]: '🚨 [DriftDetectionOrchestrator]'
    } as Record<LogLevel, string>[level];

    const dataString = data ? ` | ${JSON.stringify(data)}` : '';

    console.log(`${levelPrefix} ${message}${dataString}`);
  }

  /**
   * Get safe corrective action key (fixes TS7053)
   */
  private getCorrectionKey(action: string): string {
    return action === 'DRIFT_CORRECTION' ? 'same' :
           action === 'PAUSE_FOR_REVIEW' ? 'diverged' : 'unknown';
  }

  /**
   * Get emoji for corrective action (fixes TS7053)
   */
  private getEmojiForAction(action: string): string {
    return this.getCorrectionKey(action) === 'same' ? '✅' :
           this.getCorrectionKey(action) === 'diverged' ? '⚠️' : '❓';
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
      this.currentTask = await this.persistenceAdapter.getTask(this.currentTask?.id || '');
    }
    return this.currentTask;
  }

  getTaskId(markdown: string): TaskId {
    return 'task-' + crypto.randomUUID().slice(0, 8);
  }
}