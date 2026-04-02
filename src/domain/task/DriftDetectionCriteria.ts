/**
 * [LAYER: DOMAIN]
 * Principle: Pure configuration contracts for drift detection behavior
 * Prework Status: 
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - [NEW] Implements DriftDetectionCriteria for drift prevention threshold configuration
 */

/**
 * Configuration contract for drift detection thresholds
 * Controls how aggressive/slow drift detection should be
 */
export interface DriftDetectionCriteria {
  /**
   * Maximum drift score before requiring user confirmation
   * Range: 0.0 - 1.0 (default: 0.3 = 30% drift)
   */
  maxDriftThreshold: number;
  
  /**
   * Drift score above which agent action is blocked until confirmed
   * Range: 0.0 - 1.0 (default: 0.6 = 60% drift)
   * Must be less than or equal to requiresConfirmationForDriftAbove
   */
  requiresConfirmationForDriftAbove: number;
  
  /**
   * Token count interval between automatic checkpoints
   * Determines checkpoint frequency (default: 1000 tokens)
   */
  checkpointInterval: number;
  
  /**
   * Semantic similarity threshold for semantic integrity checks
   * Range: 0.0 - 1.0 (default: 0.85 = 85% similarity)
   * When below this, considered drift
   */
  semanticSimilarityThreshold: number;
  
  /**
   * Maximum drift score for transition to FAILED state
   * Range: 0.0 - 1.0 (default: 0.95 = 95% drift)
   */
  maxFailureThreshold: number;
  
  /**
   * Whether to enforce strict mode (all drift > 0 triggers confirmation)
   * Range: boolean (default: false)
   */
  strictModeEnabled: boolean;
  
  /**
   * Whether to restore from last checkpoint on severe drift errors
   * Range: boolean (default: true)
   */
  autoRestoreOnCriticalDrift: boolean;
  
  /**
   * Maximum number of checkpoints to keep in memory cache
   * Range: 0 - 1000 (default: 50)
   */
  maxCheckpointCacheSize: number;
  
  /**
   * Whether to log drift predictions to console
   * Range: boolean (default: false for performance)
   */
  logDriftPredictions: boolean;
  
  /**
   * Whether to enable drift prediction heuristics
   * Range: boolean (default: true)
   */
  enableDriftPrediction: boolean;
}

/**
 * Factory function with sensible defaults for drift detection
 */
export function createDefaultDriftCriteria(): DriftDetectionCriteria {
  return {
    maxDriftThreshold: 0.3,
    requiresConfirmationForDriftAbove: 0.6,
    checkpointInterval: 1000,
    semanticSimilarityThreshold: 0.85,
    maxFailureThreshold: 0.95,
    strictModeEnabled: false,
    autoRestoreOnCriticalDrift: true,
    maxCheckpointCacheSize: 50,
    logDriftPredictions: false,
    enableDriftPrediction: true
  };
}

/**
 * Validation rules for drift detection criteria
 */
export function validateDriftCriteria(criteria: DriftDetectionCriteria): void {
  if (typeof criteria.maxDriftThreshold !== 'number') {
    throw new ValidationError('maxDriftThreshold must be a number');
  }

  if (criteria.maxDriftThreshold < 0 || criteria.maxDriftThreshold > 1) {
    throw new ValidationError('maxDriftThreshold must be between 0 and 1');
  }

  if (typeof criteria.requiresConfirmationForDriftAbove !== 'number') {
    throw new ValidationError('requiresConfirmationForDriftAbove must be a number');
  }

  if (criteria.requiresConfirmationForDriftAbove >= 1 || criteria.requiresConfirmationForDriftAbove < 0) {
    throw new ValidationError('requiresConfirmationForDriftAbove must be between 0 and 1');
  }

  if (criteria.requiresConfirmationForDriftAbove <= criteria.maxDriftThreshold) {
    throw new ValidationError('requiresConfirmationForDriftAbove must be greater than maxDriftThreshold');
  }

  if (typeof criteria.checkpointInterval !== 'number') {
    throw new ValidationError('checkpointInterval must be a number');
  }

  if (criteria.checkpointInterval < 0) {
    throw new ValidationError('checkpointInterval cannot be negative');
  }

  if (typeof criteria.semanticSimilarityThreshold !== 'number') {
    throw new ValidationError('semanticSimilarityThreshold must be a number');
  }

  if (criteria.semanticSimilarityThreshold < 0 || criteria.semanticSimilarityThreshold > 1) {
    throw new ValidationError('semanticSimilarityThreshold must be between 0 and 1');
  }

  if (typeof criteria.maxFailureThreshold !== 'number') {
    throw new ValidationError('maxFailureThreshold must be a number');
  }

  if (criteria.maxFailureThreshold < 0 || criteria.maxFailureThreshold > 1) {
    throw new ValidationError('maxFailureThreshold must be between 0 and 1');
  }

  if (criteria.strictModeEnabled === undefined || typeof criteria.strictModeEnabled !== 'boolean') {
    throw new ValidationError('strictModeEnabled must be a boolean');
  }

  if (criteria.autoRestoreOnCriticalDrift === undefined || typeof criteria.autoRestoreOnCriticalDrift !== 'boolean') {
    throw new ValidationError('autoRestoreOnCriticalDrift must be a boolean');
  }

  if (typeof criteria.maxCheckpointCacheSize !== 'number') {
    throw new ValidationError('maxCheckpointCacheSize must be a number');
  }

  if (criteria.maxCheckpointCacheSize < 0) {
    throw new ValidationError('maxCheckpointCacheSize cannot be negative');
  }

  if (typeof criteria.logDriftPredictions !== 'boolean') {
    throw new ValidationError('logDriftPredictions must be a boolean');
  }

  if (typeof criteria.enableDriftPrediction !== 'boolean') {
    throw new ValidationError('enableDriftPrediction must be a boolean');
  }
}

/**
 * Adjustable drift criteria for different environments
 */
export class DriftProfilingLevel {
  static readonly DEVELOPER = {
    maxDriftThreshold: 0.5,
    requiresConfirmationForDriftAbove: 0.7,
    checkpointInterval: 500,
    semanticSimilarityThreshold: 0.75,
    strictModeEnabled: true,
    maxCheckpointCacheSize: 100,
    logDriftPredictions: true,
    enableDriftPrediction: true
  };

  static readonly PRODUCTION = {
    maxDriftThreshold: 0.2,
    requiresConfirmationForDriftAbove: 0.5,
    checkpointInterval: 2000,
    semanticSimilarityThreshold: 0.9,
    strictModeEnabled: false,
    maxCheckpointCacheSize: 30,
    logDriftPredictions: false,
    enableDriftPrediction: false
  };

  static readonly EXPERIMENTAL = {
    maxDriftThreshold: 0.1,
    requiresConfirmationForDriftAbove: 0.3,
    checkpointInterval: 100,
    semanticSimilarityThreshold: 0.95,
    strictModeEnabled: true,
    maxCheckpointCacheSize: 200,
    logDriftPredictions: true,
    enableDriftPrediction: true
  };
}

/**
 * Environment-aware drift criteria selection
 */
export function getDriftCriteriaForEnvironment(env: 'development' | 'staging' | 'production'): DriftDetectionCriteria {
  switch (env) {
    case 'development':
      return DriftProfilingLevel.DEVELOPER;
    case 'staging':
      return createDefaultDriftCriteria();
    case 'production':
      return DriftProfilingLevel.PRODUCTION;
    default:
      return createDefaultDriftCriteria();
  }
}

/**
 * Default validation error type
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Optimized drift detection recommendation
 */
export interface DriftDetectionRecommendation {
  /**
   * Whether to proceed with current action
   */
  shouldProceed: boolean;
  
  /**
   * Whether user confirmation is required
   */
  requiresUserConfirmation: boolean;
  
  /**
   * Suggested corrective action
   */
  correctiveAction: CorrectionType;
  
  /**
   * More detailed explanation
   */
  explanation: string;
  
  /**
   * Suggested task state after action
   */
  suggestedState: TaskState;
}

/**
 * Computes drift detection recommendation based on current credentials
 */
export function computeDriftRecommendation(
  currentDriftScore: number,
  criteria: DriftDetectionCriteria,
  currentTaskState: TaskState
): DriftDetectionRecommendation {
  // Determine what action to take based on drift score
  if (currentDriftScore >= criteria.maxFailureThreshold) {
    return {
      shouldProceed: false,
      requiresUserConfirmation: false,
      correctiveAction: CorrectionType.PAUSE_FOR_REVIEW,
      explanation: `Critical drift detected (score: ${currentDriftScore.toFixed(2)}). Maximum failure threshold exceeded.`,
      suggestedState: TaskState.FAILED
    };
  }

  if (currentDriftScore >= criteria.requiresConfirmationForDriftAbove) {
    return {
      shouldProceed: false,
      requiresUserConfirmation: true,
      correctiveAction: CorrectionType.PAUSE_FOR_REVIEW,
      explanation: `Moderate drift detected (score: ${currentDriftScore.toFixed(2)}). Requires user confirmation before proceeding.`,
      suggestedState: TaskState.SUSPENDED
    };
  }

  if (criteria.strictModeEnabled && currentDriftScore >= criteria.maxDriftThreshold) {
    return {
      shouldProceed: currentTaskState === TaskState.IN_PROGRESS,
      requiresUserConfirmation: true,
      correctiveAction: CorrectionType.REINFORCE_OBJECTIVE,
      explanation: `Drift exceeds acceptable threshold (score: ${currentDriftScore.toFixed(2)}). Please re-anchor to core objective.`,
      suggestedState: currentTaskState === TaskState.IN_PROGRESS 
        ? TaskState.SUSPENDED 
        : currentTaskState
    };
  }

  return {
    shouldProceed: true,
    requiresUserConfirmation: false,
    correctiveAction: CorrectionType.DRIFT_CORRECTION,
    explanation: `Drift within acceptable range (score: ${currentDriftScore.toFixed(2)}). Proceeding with current approach.`,
    suggestedState: currentTaskState
  };
}

/**
 * Drift score normalization helper
 * Maps raw semantic distance to 0.0-1.0 drift score
 */
export function normalizeDriftScore(semanticDistance: number, maxDistance: number): number {
  if (maxDistance === 0) return 0;
  return Math.min(semanticDistance / maxDistance, 1.0);
}

/**
 * Calculates drift penalty based on credentials
 */
export function calculateDriftPenalty(
  driftScore: number,
  targetScore: number,
  criteria: DriftDetectionCriteria
): number {
  const delta = driftScore - targetScore;
  const factor = criteria.maxFailureThreshold - criteria.requiresConfirmationForDriftAbove;
  
  return (delta / factor) * 0.5; // Normalize to penalty range
}