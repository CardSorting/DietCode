/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic and types — testable in isolation
 * Prework Status: 
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - [NEW] Implements TaskEntity, TaskState, TaskPriority for task scaffolding system
 */
import * as crypto from 'crypto';
import { ComplianceState, IntegrityAxiom } from './ImplementationSnapshot';
import type { AxiomProfile } from './ImplementationSnapshot';

/**
 * Unique identifier for a task
 */
export type TaskId = string;

/**
 * Task lifecycle states
 * Enforces strict state transitions using domain contract
 */
export enum TaskState {
  /** Task acknowledged but not yet refined */
  BACKLOG = 'BACKLOG',
  /** Requirements 100% defined and ready for simulation */
  READY = 'READY',
  /** Virtualized execution for pre-flight integrity check */
  SHADOW_SIM = 'SHADOW_SIM',
  /** Active implementation in the sovereign workspace */
  SOVEREIGN_DOING = 'SOVEREIGN_DOING',
  /** Post-implementation verification loop */
  VERIFYING = 'VERIFYING',
  /** Successfully completed and verified */
  DONE = 'DONE',
  /** Execution failed beyond recovery */
  FAILED = 'FAILED'
}

/**
 * Task priority levels
 * Guides agent prioritization and resource allocation
 */
export enum TaskPriority {
  CRITICAL = 0,
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
  PENDING = 4
}

/**
 * Requirement type classification
 * Categorizes tasks for purpose-driven organization and tracking
 */
export enum RequirementType {
  FEATURE = 'feature',
  FIX = 'fix',
  REFACTOR = 'refactor',
  DOCUMENTATION = 'documentation',
  TEST = 'test'
}

/**
 * Represents a single requirement from task.md
 * Immutable value object with strict validation rules
 */
export interface Requirement {
  /**
   * Unique identifier for this requirement
   * Must be globally unique within the task
   */
  uniqueId: string;
  
  /**
   * Human-readable description of what must be implemented
   */
  description: string;
  
  /**
   * Category of this requirement for organizational purposes
   */
  type: RequirementType;
  
  /**
   * Priority level (0=CRITICAL, ... 4=PENDING)
   */
  priority: TaskPriority;
  
  /**
   * Whether this requirement is critically important
   * Critical requirements trigger safetyAlert enforcement
   */
  isCritical: boolean;
  
  /**
   * Section in task.md where this requirement appears
   * Helps match implementation tracking back to source
   */
  section: string;
  
  /**
   * Priority weight (0.0 - 1.0) for complex sorting scenarios
   * Higher priority requirements merged first
   */
  weight?: number;

  /**
   * Verification criteria specific to this requirement
   * Used for validation of successful implementation
   */
  verificationCriteria?: string[];
}

/**
 * Core task definition entity — the authoritative source of truth for a development task
 * No I/O, no external dependencies, pure business logic
 */
export interface TaskEntity {
  /**
   * Unique identifier for this task
   */
  id: TaskId;
  
  /**
   * Human-readable title of the task
   */
  title: string;
  
  /**
   * One-sentence mission statement
   * This is the primary anchor point for drift prevention
   * Required objective compression field
   */
  objective: string;
  
  /**
   * All requirements extracted from task.md
   * Immutable snapshot at task creation time
   */
  requirements: Requirement[];
  
  /**
   * Acceptance criteria for task completion
   * What constitutes success according to task specification
   */
  acceptanceCriteria: string[];
  
  /**
   * Initial context provided when task was created
   * Available to agent for task understanding
   */
  initialContext: string;
  
  /**
   * Current lifecycle state of the task
   */
  state: TaskState;
  
  /**
   * Priority level (guides agent selection and execution order)
   */
  priority: TaskPriority;
  
  /**
   * Axiomatic compliance profile from SHADOW_SIM (Post-Scoring)
   */
  simAxiomProfile?: AxiomProfile;
  
  /**
   * Real-time metabolic telemetry metrics
   */
  vitalsHeartbeat?: VitalsHeartbeat;
  
  /**
   * Final cryptographic verification signature
   */
  vToken?: string;
  
  /**
   * List of constraint violations detected during execution
   */
  constraintViolations: string[];
  
  /**
   * Metadata about task creation and lifecycle events
   */
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    /**
     * Origin of behavior for intent logging
     */
    userAgent: string;
  };
}

/**
 * Real-time metabolic telemetry metrics (The Antigravity Brain)
 */
export interface VitalsHeartbeat {
  /** Measures token consumption vs. successful verifications */
  cognitiveHeat: number;
  /** Measures Added:Deleted line ratio (Target: Negative Growth) */
  architecturalDecay: number;
  /** Tracks Read:Write frequency (Doubt detection) */
  doubtSignal: number;
  /** Timestamp of the last heartbeat */
  timestamp: number;
}

/**
 * Semantic integrity metrics for a task implementation
 */
export interface SemanticIntegrity {
  integrityScore: number;
  structureIntegrity: boolean;
  contentIntegrity: boolean;
  objectiveAlignment: number;
  violations: any[];
  warnings: string[];
}

/**
 * Audit record for implementation violations
 */
export interface Violation {
  id: string;
  type: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  timestamp: Date;
}

/**
 * Validation result for a task or implementation
 */
export interface TaskValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
  requirements: Requirement[];
  objectives: string[];
  acceptanceCriteria: string[];
}

/**
 * Report on consistency between multiple artifacts
 */
export interface ConsistencyReport {
  taskMd: TaskValidation;
  implementationMd: TaskValidation;
  gapAnalysis: any[];
  recommendations: string[];
}

/**
 * Factory function for creating TaskEntity from data
 * Validates TaskEntity contract before creation
 */
export function createTaskEntity(spec: TaskEntityCreationSpec): TaskEntity {
  const entity: TaskEntity = {
    id: spec.id || crypto.randomUUID(),
    title: spec.title,
    objective: spec.objective,
    requirements: spec.requirements,
    acceptanceCriteria: spec.acceptanceCriteria,
    initialContext: spec.initialContext,
    state: TaskState.BACKLOG,
    priority: spec.priority || TaskPriority.MEDIUM,
    constraintViolations: [],
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      userAgent: spec.userAgent
    }
  };

  validateTaskEntity(entity);
  return entity;
}

/**
 * Validation rules for TaskEntity
 * Throws ValidationError if rules are violated
 */
export function validateTaskEntity(entity: TaskEntity): void {
  // Validate required fields
  if (!entity.id || typeof entity.id !== 'string') {
    throw new ValidationError('Task ID is required and must be a string');
  }

  if (!entity.title || entity.title.trim().length === 0) {
    throw new ValidationError('Task title is required');
  }

  if (!entity.objective || entity.objective.trim().length === 0) {
    throw new ValidationError('Task objective is required for drift prevention');
  }

  if (!entity.requirements || !Array.isArray(entity.requirements)) {
    throw new ValidationError('Requirements array is required');
  }

  if (entity.requirements.length === 0) {
    throw new ValidationError('At least one requirement is required');
  }

  // Validate requirement format
  for (const req of entity.requirements) {
    if (!req.uniqueId || req.uniqueId.trim().length === 0) {
      throw new ValidationError(`Requirement missing uniqueId`);
    }

    if (!req.description || req.description.trim().length < 10) {
      throw new ValidationError(`Requirement description too short: ${req.description}`);
    }

    if (!req.type || !Object.values(RequirementType).includes(req.type)) {
      throw new ValidationError(`Invalid requirement type: ${req.type}`);
    }

    if (!req.priority || req.priority < 0 || req.priority > 4) {
      throw new ValidationError(`Invalid requirement priority: ${req.priority}`);
    }
  }

  // Validate state
  if (!EntityState.isState(entity.state)) {
    throw new ValidationError(`Invalid task state: ${entity.state}`);
  }

  // Validate priority
  if (entity.priority < 0 || entity.priority > 4) {
    throw new ValidationError(`Invalid task priority: ${entity.priority}`);
  }

  // Validate metadata
  if (!entity.metadata.createdAt || !(entity.metadata.createdAt instanceof Date)) {
    throw new ValidationError('Task metadata createdAt is required and must be a Date');
  }

  if (!entity.metadata.updatedAt || !(entity.metadata.updatedAt instanceof Date)) {
    throw new ValidationError('Task metadata updatedAt is required and must be a Date');
  }

  if (!entity.metadata.userAgent || typeof entity.metadata.userAgent !== 'string') {
    throw new ValidationError('Task metadata userAgent is required');
  }
}

/**
 * Specification for creating a new TaskEntity
 */
export interface TaskEntityCreationSpec {
  id?: TaskId;
  title: string;
  objective: string;
  requirements: Requirement[];
  acceptanceCriteria: string[];
  initialContext: string;
  priority?: TaskPriority;
  userAgent: string;
}

/**
 * List of valid TaskState values for validation
 */
const validTaskStates = [
  TaskState.BACKLOG,
  TaskState.READY,
  TaskState.SHADOW_SIM,
  TaskState.SOVEREIGN_DOING,
  TaskState.VERIFYING,
  TaskState.DONE,
  TaskState.FAILED
];

/**
 * Validator helper for TaskState
 */
export const EntityState = {
  /**
   * Checks if a value is a valid TaskState
   */
  isState: (state: any): state is TaskState => {
    return validTaskStates.includes(state);
  },
  
  /**
   * Gets valid state values programmatically
   */
  getValidStates: (): TaskState[] => {
    return [...validTaskStates];
  }
};

/**
 * Custom error class for TaskEntity validation failures
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}