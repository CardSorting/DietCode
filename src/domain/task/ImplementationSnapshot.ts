/**
 * [LAYER: DOMAIN]
 * Principle: Pure value objects for immutable execution state tracking
 * Prework Status: 
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - [NEW] Implements ImplementationSnapshot for checkpoint tracking and drift detection
 */
import { TaskState } from '../../domain/task/TaskEntity';
import type { TaskId, TaskEntity, Requirement } from '../../domain/task/TaskEntity';
import * as crypto from 'crypto';
export type CheckpointId = string;

/**
 * Token hash for content integrity verification
 */
export interface TokenHash {
  hash: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Snapshot of implementation progress at a specific point in time
 * Immutable value object representing the state of task execution
 */
export interface ImplementationSnapshot {
  /**
   * Unique identifier for this checkpoint
   */
  checkpointId: CheckpointId;
  
  /**
   * ID of the task this checkpoint belongs to
   */
  taskId: string;
  
  /**
   * Timestamp when this snapshot was created
   */
  timestamp: Date;
  
  /**
   * Total number of completed requirements at this checkpoint
   */
  completedRequirements: Requirement[];
  
  /**
   * Requirements still pending at this checkpoint
   */
  pendingRequirements: Requirement[];
  
  /**
   * Total count of requirement types tracked
   */
  totalRequirements: number;
  
  /**
   * Human-readable explanation of detected drift
   */
  driftReason?: string;
  
  /**
   * Semantic health of the implementation
   * Indicates adherence to safety and quality standards
   */
  semanticHealth: SemanticHealth;
  
  /**
   * SHA-256 hash of the agent's output content
   */
  outputHash: string;
  
  /**
   * Size of output in bytes
   */
  outputSizeBytes: number;
  
  /**
   * Current state of the task at this checkpoint
   */
  state: TaskState;
  
  /**
   * Number of tokens processed up to this checkpoint
   */
  tokensProcessed: number;
  
  /**
   * Tracking metadata for this checkpoint
   */
  metadata: SnapshotMetadata;
}

/**
 * Axiomatic health metrics — indicates implementation compliance and safety
 */
export interface SemanticHealth {
  /**
   * Multi-tiered axiomatic verification results
   */
  axiomProfile: AxiomProfile;
  
  /**
   * List of violations detected in this snapshot
   */
  violations: Violation[];
  
  /**
   * List of warnings that didn't block execution but were logged
   */
  warnings: string[];
}

/**
 * Audit record for implementation violations
 */
export interface Violation {
  /**
   * Unique violation identifier for this instance
   */
  id: string;
  
  /**
   * Type of violation detected
   */
  type: ViolationType;
  
  /**
   * Human-readable description of the violation
   */
  message: string;
  
  /**
   * Severity of this violation
   */
  severity: 'error' | 'warning' | 'info';
  
  /**
   * Location information if available
   */
  location?: {
    file: string;
    lineNumber?: number;
    codeSnippet?: string;
  };
  
  /**
   * When this violation was detected
   */
  timestamp: Date;
}

/**
 * Contextual Axioms for layer-specific compliance
 */
export enum ContextualAxiom {
  CORE_STABILITY = 'core_stability',
  DOMAIN_PURITY = 'domain_purity',
  INFRA_HARDENING = 'infra_hardening',
  TEST_COVERAGE = 'test_coverage'
}

/**
 * Types of violations detected in implementation
 */
export enum ViolationType {
  DOMAIN_PURITY = 'domain_purity',
  CROSS_LAYER_IMPORT = 'cross_layer_import',
  IO_IN_DOMAIN = 'io_in_domain',
  DOMAIN_LEAK = 'domain_leak',
  GHOST_IMPLEMENTATION = 'ghost_implementation',
  TASK_MISALIGNMENT = 'task_misalignment',
  ROLLBACK_REQUIRED = 'rollback_required',
  AXIOM_VIOLATION = 'axiom_violation',
  HIGH_COMPLEXITY = 'high_complexity'
}

/**
 * Axioms for deterministic integrity verification
 */
export enum IntegrityAxiom {
  STRUCTURAL = 'structural', // File/Markdown structure integrity
  RESONANCE = 'resonance',   // Semantic objective alignment
  PURITY = 'purity',         // Architectural layer separation
  STABILITY = 'stability',    // Drift constraint compliance
  INTERFACE_INTEGRITY = 'interface_integrity', // Ghost implementation check
  COGNITIVE_SIMPLICITY = 'cognitive_simplicity' // Maintenance guard
}

/**
 * Compliance state derived from axiom verification
 */
export enum ComplianceState {
  CLEARED = 'CLEARED',   // All critical axioms passing
  FLAGGED = 'FLAGGED',   // Minor structural warnings
  BLOCKED = 'BLOCKED'    // Critical axiom violation
}

/**
 * Results of axiomatic verification
 */
export interface AxiomProfile {
  status: ComplianceState;
  failingAxioms: IntegrityAxiom[];
  axiomResults: Record<IntegrityAxiom, boolean>;
}

/**
 * Tracker metadata for checkpoint lifecycle
 */
export interface SnapshotMetadata {
  /**
   * Trigger that caused this checkpoint creation
   */
  trigger: CheckpointTrigger;
  
  /**
   * Checkpoint ID that was validated (if applicable)
   */
  validatedBy?: CheckpointId;
  
  /**
   * ID of the parent checkpoint (for chaining snapshots)
   */
  parentCheckpointId?: CheckpointId;
  
  /**
   * Indicates if user confirmation was required before proceeding
   */
  userConfirmationRequired?: boolean;
  
  /**
   * Drift assessment result if this was created after processing
   */
  driftAssessment?: DriftAssessment;
}

/**
 * Triggers that cause checkpoint creation
 */
export enum CheckpointTrigger {
  /**
   * Checkpoint created automatically at task initialization
   */
  INITIALIZATION = 'initialization',
  
  /**
   * Checkpoint created automatically after agent processing
   */
  DEMOGRAPHIC = 'demographic',
  
  /**
   * Explicit manual checkpoint command
   */
  MANUAL = 'manual',
  
  /**
   * Checkpoint created after safety violation
   */
  SAFETY_VIOLATION = 'safety_violation',
  
  /**
   * Checkpoint created to restore state
   */
  RESTORE = 'restore',
  
  /**
   * Checkpoint created after validation
   */
  VALIDATION = 'validation'
}

/**
 * Drift assessment result from comparing two snapshots
 */
export interface DriftAssessment {
  /**
   * Axiomatic compliance status
   */
  status: ComplianceState;
  
  /**
   * Explains why drift is happening
   */
  driftExplanation: string;
  
  /**
   * Semantic distance between outputs
   */
  semanticDistance: number;
  
  /**
   * Recommended corrective actions
   */
  recommendations: CorrectionProtocol[];
  
  /**
   * Whether agent action must be flagged for user approval
   */
  requiresApproval: boolean;
  
  /**
   * Suggested task state after drift assessment
   */
  suggestedState: TaskState;
}

/**
 * Severity classification for detected drift
 */
export enum DriftSeverity {
  /**
   * Minimal deviation — within acceptable bounds
   */
  MINIMAL = 'MINIMAL',
  
  /**
   * Moderate deviation — requires awareness
   */
  MODERATE = 'MODERATE',
  
  /**
   * Critical deviation — must be corrected
   */
  CRITICAL = 'CRITICAL',
  
  /**
   * System failure — complete deviation beyond recovery
   */
  SYSTEM_FAILURE = 'SYSTEM_FAILURE'
}

/**
 * Correction protocol recommended by drift detection system
 */
export interface CorrectionProtocol {
  /**
   * Type of corrective action to take
   */
  type: CorrectionType;
  
  /**
   * Detailed command to execute
   */
  command: string;
  
  /**
   * Reasoning behind this correction
   */
  reasoning: string;
  
  /**
   * Additional parameters if needed
   */
  params?: Record<string, any>;
}

/**
 * Types of corrective actions supported
 */
export enum CorrectionType {
  /**
   * Reinforce objective reminder to re-anchor agent
   */
  REINFORCE_OBJECTIVE = 'reinforce_objective',
  
  /**
   * Apply drift correction based on similarity detection
   */
  DRIFT_CORRECTION = 'drift_correction',
  
  /**
   * Reset execution state to previous checkpoint
   */
  STATE_RESET = 'state_reset',
  
  /**
   * Continue with explicit user confirmation required
   */
  CONTINUE_WITH_CONFIRMATION = 'continue_with_confirmation',
  
  /**
   * Pause execution and request manual review
   */
  PAUSE_FOR_REVIEW = 'pause_for_review'
}

/**
 * Vectors for checking drift: topic, scope, quality dimensions
 */
export interface DriftVector {
  /**
   * Topic divergence metric (0.0-1.0) — how far content is from original intent
   */
  topicDivergence: number;
  
  /**
   * Scope creep metric (0.0-1.0) — unexpected features added
   */
  scopeCreep: number;
}

/**
 * Factory function to create implementation snapshot from validation results
 * Validates snapshot contract before creation
 */
export function createImplementationSnapshot(
  spec: ImplementationSnapshotCreationSpec
): ImplementationSnapshot {
  const snapshot: ImplementationSnapshot = {
    checkpointId: spec.checkpointId || generateCheckpointId(),
    taskId: spec.taskId,
    timestamp: new Date(),
    completedRequirements: spec.completedRequirements || [],
    pendingRequirements: spec.pendingRequirements || [],
    totalRequirements: spec.totalRequirements || 0,
    semanticHealth: spec.semanticHealth || createDefaultSemanticHealth(),
    outputHash: spec.outputHash || '',
    outputSizeBytes: spec.outputSizeBytes || 0,
    state: spec.state,
    tokensProcessed: spec.tokensProcessed || 0,
    metadata: {
      trigger: spec.trigger,
      validatedBy: spec.validatedBy,
      parentCheckpointId: spec.parentCheckpointId,
      userConfirmationRequired: spec.userConfirmationRequired,
      driftAssessment: spec.driftAssessment
    }
  };

  validateImplementationSnapshot(snapshot);
  return snapshot;
}

/**
 * Defaults for semantic health when not explicitly provided
 */
function createDefaultSemanticHealth(): SemanticHealth {
  return {
    axiomProfile: {
      status: ComplianceState.BLOCKED,
      failingAxioms: [IntegrityAxiom.STRUCTURAL],
      axiomResults: {
        [IntegrityAxiom.STRUCTURAL]: false,
        [IntegrityAxiom.RESONANCE]: false,
        [IntegrityAxiom.PURITY]: false,
        [IntegrityAxiom.STABILITY]: false,
        [IntegrityAxiom.INTERFACE_INTEGRITY]: false,
        [IntegrityAxiom.COGNITIVE_SIMPLICITY]: false
      }
    },
    violations: [],
    warnings: []
  };
}

/**
 * Validation rules for ImplementationSnapshot
 */
function validateImplementationSnapshot(snapshot: ImplementationSnapshot): void {
  // Validate required fields
  if (!snapshot.checkpointId || typeof snapshot.checkpointId !== 'string') {
    throw new ValidationError('Checkpoint ID is required and must be a string');
  }

  if (!snapshot.taskId || typeof snapshot.taskId !== 'string') {
    throw new ValidationError('Task ID is required');
  }

  if (!snapshot.timestamp || !(snapshot.timestamp instanceof Date)) {
    throw new ValidationError('Timestamp is required and must be a Date');
  }

  if (!snapshot.completedRequirements || !Array.isArray(snapshot.completedRequirements)) {
    throw new ValidationError('Completed requirements array is required');
  }

  if (!snapshot.semanticHealth) {
    throw new ValidationError('Semantic health is required');
  }

  if (!snapshot.state) {
    throw new ValidationError('Task state is required');
  }

  if (!snapshot.metadata) {
    throw new ValidationError('Snapshot metadata is required');
  }

  // Validate metadata
  if (!Object.values(CheckpointTrigger).includes(snapshot.metadata.trigger)) {
    throw new ValidationError(`Invalid trigger type: ${snapshot.metadata.trigger}`);
  }
}

/**
 * Generates a deterministic checkpoint ID
 */
export function generateCheckpointId(): CheckpointId {
  return `ckpt-${crypto.randomUUID().slice(0, 12)}`;
}

/**
 * Creates Violation audit record
 */
export function createViolation(spec: ViolationCreationSpec): Violation {
  return {
    id: spec.id || crypto.randomUUID(),
    type: spec.type,
    message: spec.message,
    severity: spec.severity,
    location: spec.location,
    timestamp: spec.timestamp || new Date()
  };
}

/**
 * Creates CorrectionProtocol recommendation
 */
export function createCorrection(spec: CorrectionCreationSpec): CorrectionProtocol {
  return {
    type: spec.type,
    command: spec.command,
    reasoning: spec.reasoning,
    params: spec.params
  };
}

/**
 * Creation spec for ImplementationSnapshot
 */
export interface ImplementationSnapshotCreationSpec {
  checkpointId?: CheckpointId;
  taskId: string;
  completedRequirements?: Requirement[];
  pendingRequirements?: Requirement[];
  totalRequirements?: number;
  driftReason?: string;
  semanticHealth?: SemanticHealth;
  outputHash: string;
  outputSizeBytes?: number;
  state: TaskState;
  tokensProcessed?: number;
  trigger: CheckpointTrigger;
  validatedBy?: CheckpointId;
  parentCheckpointId?: CheckpointId;
  userConfirmationRequired?: boolean;
  driftAssessment?: DriftAssessment;
}

/**
 * Creation spec for Violation
 */
export interface ViolationCreationSpec {
  id?: string;
  type: ViolationType;
  message: string;
  severity: 'error' | 'warning' | 'info';
  location?: {
    file: string;
    lineNumber?: number;
    codeSnippet?: string;
  };
  timestamp?: Date;
}

/**
 * Creation spec for CorrectionProtocol
 */
export interface CorrectionCreationSpec {
  type: CorrectionType;
  command: string;
  reasoning: string;
  params?: Record<string, any>;
}

/**
 * Computes checkpoint hash for content-based integrity verification
 */
export function computeCheckpointHash(
  taskId: string,
  checkpointId: CheckpointId,
  drivenTasks?: number,
  outputContent?: string
): string {
  const data = [
    taskId,
    checkpointId,
    drivenTasks?.toString() || '0',
    outputContent || ''
  ].join('|');

  return crypto.createHash('sha-256').update(data).digest('hex');
}

/**
 * Calculates drift delta between two consecutive snapshots
 */
export function calculateDriftDelta(
  before: ImplementationSnapshot,
  after: ImplementationSnapshot
): DriftVector {
  const isAxiomCompliant = after.semanticHealth.axiomProfile.status === ComplianceState.CLEARED;
  return {
    topicDivergence: isAxiomCompliant ? 0.0 : 1.0,
    scopeCreep: after.totalRequirements > before.totalRequirements ? (after.totalRequirements - before.totalRequirements) / before.totalRequirements : 0.0
  };
}

/**
 * Custom error for validation failures
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}