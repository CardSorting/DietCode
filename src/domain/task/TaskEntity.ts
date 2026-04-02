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

/**
 * Unique identifier for a task
 */
export type TaskId = string;

/**
 * Task lifecycle states
 * Enforces strict state transitions using domain contract
 */
export enum TaskState {
  /** Initial state: not yet started */
  QUEUED = 'QUEUED',
  /** Actively being worked on */
  IN_PROGRESS = 'IN_PROGRESS',
  /** Task paused for user feedback or drift correction */
  SUSPENDED = 'SUSPENDED',
  /** Complete validation pending manual review */
  REVIEW_PENDING = 'REVIEW_PENDING',
  /** Successfully completed and verified */
  COMPLETED = 'COMPLETED',
  /** Execution failed beyond recovery */
  FAILED = 'FAILED',
  /** Moved to archive */
  ARCHIVED = 'ARCHIVED'
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
   * Enforced by TaskState machine transitions
   */
  state: TaskState;
  
  /**
   * Priority level (guides agent selection and execution order)
   */
  priority: TaskPriority;
  
  /**
   * List of constraint violations detected during execution
   * Prevents execution of unsafe state transitions
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
     * Clarifies source vs. standard execution
     */
    userAgent: string;
    /**
     * Optional correlation ID for external systems
     */
    executionId?: string;
  };
}

/**
 * Factory function for creating TaskEntity from data
 * Validates TaskEntity contract before creation
 */
export function createTaskEntity(spec: TaskEntityCreationSpec): TaskEntity {
  const entity: TaskEntity = {
    id: spec.id,
    title: spec.title,
    objective: spec.objective,
    requirements: spec.requirements,
    acceptanceCriteria: spec.acceptanceCriteria,
    initialContext: spec.initialContext,
    state: TaskState.QUEUED,
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
  TaskState.QUEUED,
  TaskState.IN_PROGRESS,
  TaskState.SUSPENDED,
  TaskState.REVIEW_PENDING,
  TaskState.COMPLETED,
  TaskState.FAILED,
  TaskState.ARCHIVED
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