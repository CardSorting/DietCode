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
import { TaskState } from './TaskEntity';
import { CorrectionType, IntegrityAxiom, ComplianceState, ContextualAxiom } from './ImplementationSnapshot';
import type { AxiomProfile } from './ImplementationSnapshot';

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
   * Enabled axioms for verification
   */
  enabledAxioms: IntegrityAxiom[];
  
  /**
   * Maximum tolerated alignment divergence before blocking (Legacy: use Axioms)
   */
  maxFailureThreshold: number;
  
  /**
   * Whether to restore from last checkpoint on severe drift errors
   */
  autoRestoreOnCriticalDrift: boolean;
  
  /**
   * Maximum number of checkpoints to keep in memory cache
   */
  maxCheckpointCacheSize: number;
  
  /**
   * Whether to log drift predictions to console
   */
  logDriftPredictions: boolean;
  
  /**
   * Whether to enable drift prediction heuristics
   */
  enableDriftPrediction: boolean;
}

/**
 * Maps architectural layers to mandatory axioms
 */
export const ArchitecturalAxiomMap: Record<string, IntegrityAxiom[]> = {
  domain: [IntegrityAxiom.PURITY, IntegrityAxiom.RESONANCE],
  infrastructure: [IntegrityAxiom.STRUCTURAL, IntegrityAxiom.STABILITY],
  core: [IntegrityAxiom.STABILITY, IntegrityAxiom.RESONANCE, IntegrityAxiom.STRUCTURAL],
  unknown: [IntegrityAxiom.STRUCTURAL]
};

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
    autoRestoreOnCriticalDrift: true,
    maxCheckpointCacheSize: 50,
    logDriftPredictions: false,
    enableDriftPrediction: true,
    enabledAxioms: [
      IntegrityAxiom.STRUCTURAL, 
      IntegrityAxiom.RESONANCE, 
      IntegrityAxiom.PURITY,
      IntegrityAxiom.STABILITY,
      IntegrityAxiom.INTERFACE_INTEGRITY,
      IntegrityAxiom.COGNITIVE_SIMPLICITY
    ]
  };
}

/**
 * Validation rules for drift detection criteria
 */
export function validateDriftCriteria(criteria: DriftDetectionCriteria): void {
  const validators = [
    { field: 'maxDriftThreshold', check: (v: any) => typeof v === 'number' && v >= 0 && v <= 1 },
    { field: 'requiresConfirmationForDriftAbove', check: (v: any) => typeof v === 'number' && v >= 0 && v < 1 },
    { field: 'checkpointInterval', check: (v: any) => typeof v === 'number' && v >= 0 },
    { field: 'semanticSimilarityThreshold', check: (v: any) => typeof v === 'number' && v >= 0 && v <= 1 },
    { field: 'maxFailureThreshold', check: (v: any) => typeof v === 'number' && v >= 0 && v <= 1 },
    { field: 'autoRestoreOnCriticalDrift', check: (v: any) => typeof v === 'boolean' },
    { field: 'maxCheckpointCacheSize', check: (v: any) => typeof v === 'number' && v >= 0 },
    { field: 'logDriftPredictions', check: (v: any) => typeof v === 'boolean' },
    { field: 'enableDriftPrediction', check: (v: any) => typeof v === 'boolean' }
  ];

  for (const { field, check } of validators) {
    if (!check((criteria as any)[field])) {
      throw new ValidationError(`Invalid value for ${field}`);
    }
  }

  if (criteria.requiresConfirmationForDriftAbove <= criteria.maxDriftThreshold) {
    throw new ValidationError('requiresConfirmationForDriftAbove must be greater than maxDriftThreshold');
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
    maxFailureThreshold: 0.95,
    autoRestoreOnCriticalDrift: true,
    maxCheckpointCacheSize: 100,
    logDriftPredictions: true,
    enableDriftPrediction: true,
    enabledAxioms: [IntegrityAxiom.STRUCTURAL, IntegrityAxiom.RESONANCE]
  };

  static readonly PRODUCTION = {
    maxDriftThreshold: 0.2,
    requiresConfirmationForDriftAbove: 0.5,
    checkpointInterval: 2000,
    semanticSimilarityThreshold: 0.9,
    maxFailureThreshold: 0.95,
    autoRestoreOnCriticalDrift: true,
    maxCheckpointCacheSize: 30,
    logDriftPredictions: false,
    enableDriftPrediction: false,
    enabledAxioms: [IntegrityAxiom.STRUCTURAL, IntegrityAxiom.RESONANCE, IntegrityAxiom.PURITY, IntegrityAxiom.STABILITY]
  };

  static readonly EXPERIMENTAL = {
    maxDriftThreshold: 0.1,
    requiresConfirmationForDriftAbove: 0.3,
    checkpointInterval: 100,
    semanticSimilarityThreshold: 0.95,
    maxFailureThreshold: 0.8,
    autoRestoreOnCriticalDrift: true,
    maxCheckpointCacheSize: 200,
    logDriftPredictions: true,
    enableDriftPrediction: true,
    enabledAxioms: [IntegrityAxiom.STRUCTURAL]
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
 * Computes drift detection recommendation based on axiomatic compliance
 */
export function computeDriftRecommendation(
  axiomProfile: AxiomProfile,
  criteria: DriftDetectionCriteria,
  currentTaskState: TaskState
): DriftDetectionRecommendation {
  // Determine what action to take based on Axiom Compliance
  if (axiomProfile.status === ComplianceState.BLOCKED) {
    return {
      shouldProceed: false,
      requiresUserConfirmation: false,
      correctiveAction: CorrectionType.PAUSE_FOR_REVIEW,
      explanation: `Critical Axiom Violation: ${axiomProfile.failingAxioms.join(', ')}. Entry blocked.`,
      suggestedState: TaskState.FAILED
    };
  }

  if (axiomProfile.status === ComplianceState.FLAGGED) {
    return {
      shouldProceed: false,
      requiresUserConfirmation: true,
      correctiveAction: CorrectionType.PAUSE_FOR_REVIEW,
      explanation: `Axiomatic Divergence: ${axiomProfile.failingAxioms.join(', ')}. Requires review.`,
      suggestedState: TaskState.SHADOW_SIM
    };
  }

  return {
    shouldProceed: true,
    requiresUserConfirmation: false,
    correctiveAction: CorrectionType.DRIFT_CORRECTION,
    explanation: `Axiomatic Clearance: All core constraints satisfied.`,
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