/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {
  ComplianceState,
  ContextualAxiom,
  CorrectionType,
  IntegrityAxiom,
} from './ImplementationSnapshot';
import type { AxiomProfile } from './ImplementationSnapshot';
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

/**
 * Configuration contract for drift detection thresholds
 * Controls how aggressive/slow drift detection should be
 */
export interface DriftDetectionCriteria {
  /**
   * Token count interval between automatic checkpoints
   * Determines checkpoint frequency (default: 1000 tokens)
   */
  checkpointInterval: number;

  /**
   * Enabled axioms for verification
   */
  enabledAxioms: IntegrityAxiom[];

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
  unknown: [IntegrityAxiom.STRUCTURAL],
};

/**
 * Factory function with sensible defaults for drift detection
 */
export function createDefaultDriftCriteria(): DriftDetectionCriteria {
  return {
    checkpointInterval: 1000,
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
      IntegrityAxiom.COGNITIVE_SIMPLICITY,
    ],
  };
}

/**
 * Validation rules for drift detection criteria
 */
export function validateDriftCriteria(criteria: DriftDetectionCriteria): void {
  const validators = [
    { field: 'checkpointInterval', check: (v: any) => typeof v === 'number' && v >= 0 },
    { field: 'autoRestoreOnCriticalDrift', check: (v: any) => typeof v === 'boolean' },
    { field: 'maxCheckpointCacheSize', check: (v: any) => typeof v === 'number' && v >= 0 },
    { field: 'logDriftPredictions', check: (v: any) => typeof v === 'boolean' },
    { field: 'enableDriftPrediction', check: (v: any) => typeof v === 'boolean' },
  ];

  for (const { field, check } of validators) {
    if (!check((criteria as any)[field])) {
      throw new ValidationError(`Invalid value for ${field}`);
    }
  }
}

/**
 * Adjustable drift criteria for different environments
 */
export class DriftProfilingLevel {
  private constructor() {}
  static readonly DEVELOPER = {
    checkpointInterval: 500,
    autoRestoreOnCriticalDrift: true,
    maxCheckpointCacheSize: 100,
    logDriftPredictions: true,
    enableDriftPrediction: true,
    enabledAxioms: [IntegrityAxiom.STRUCTURAL, IntegrityAxiom.RESONANCE],
  };

  static readonly PRODUCTION = {
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
  };

  static readonly EXPERIMENTAL = {
    checkpointInterval: 100,
    autoRestoreOnCriticalDrift: true,
    maxCheckpointCacheSize: 200,
    logDriftPredictions: true,
    enableDriftPrediction: true,
    enabledAxioms: [IntegrityAxiom.STRUCTURAL],
  };
}

/**
 * Environment-aware drift criteria selection
 */
export function getDriftCriteriaForEnvironment(
  env: 'development' | 'staging' | 'production',
): DriftDetectionCriteria {
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
  _criteria: DriftDetectionCriteria,
  currentTaskState: TaskState,
): DriftDetectionRecommendation {
  // Determine what action to take based on Axiom Compliance
  if (axiomProfile.status === ComplianceState.BLOCKED) {
    return {
      shouldProceed: false,
      requiresUserConfirmation: false,
      correctiveAction: CorrectionType.PAUSE_FOR_REVIEW,
      explanation: `Critical Axiom Violation: ${axiomProfile.failingAxioms.join(', ')}. Entry blocked.`,
      suggestedState: TaskState.FAILED,
    };
  }

  if (axiomProfile.status === ComplianceState.FLAGGED) {
    return {
      shouldProceed: false,
      requiresUserConfirmation: true,
      correctiveAction: CorrectionType.PAUSE_FOR_REVIEW,
      explanation: `Axiomatic Divergence: ${axiomProfile.failingAxioms.join(', ')}. Requires review.`,
      suggestedState: TaskState.SHADOW_SIM,
    };
  }

  return {
    shouldProceed: true,
    requiresUserConfirmation: false,
    correctiveAction: CorrectionType.DRIFT_CORRECTION,
    explanation: 'Axiomatic Clearance: All core constraints satisfied.',
    suggestedState: currentTaskState,
  };
}
