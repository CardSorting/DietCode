/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic, no external I/O
 * Prework Status: Not applicable (new file)
 *
 * Domain-side contract for state mutation rules and validation.
 * Ensures state changes are validated against business rules before committing.
 */

import type { GlobalState } from '../../domain/LLMProvider';

/**
 * State change lifecycle hooks
 */
export enum StateChangePhase {
  VALIDATED = 'validated',
  SANITIZED = 'sanitized',
  COMPLETED = 'completed',
  ROLLBACK = 'rollback',
}

/**
 * State change metadata
 */
export interface StateChangeMetadata {
  timestamp: number;
  correlationId: string;
  actor: string; // Who triggered the change
  source: 'user' | 'automated' | 'external' | 'api';
  validationErrors?: string[];
}

/**
 * State change protocol
 *
 * Defines the contract for validating, sanitizing, and applying state changes.
 * Each StateChange must implement a validity check that runs before persistence.
 */
export interface StateChange<T = unknown> {
  /**
   * The key being modified
   */
  key: string;

  /**
   * The new value
   */
  newValue: T;

  /**
   * Optional old value (for rollback comparison)
   */
  oldValue?: T;

  /**
   * The state set this change belongs to (e.g., "globalState", "taskSettings", "secrets")
   */
  stateSet: GlobalState;

  /**
   * Validate this change according to business rules.
   * This is the Core rule: if this returns false, the change must NOT be persisted.
   *
   * @returns True if change is valid, false otherwise
   */
  validate(): boolean;

  /**
   * Sanitize the new value if needed.
   * Simple transformations (trimming, type coercion) should happen here.
   *
   * @returns The sanitized value
   */
  sanitize(): T;

  /**
   * Generate a unique correlation ID for this change for tracking.
   */
  getCorrelationId(): string;
}

/**
 * State change result with lifecycle callbacks
 */
export interface StateChangeResult<T = unknown> {
  /**
   * The state change that was processed
   */
  change: StateChange<T>;

  /**
   * True if the change was applied, false if it was rejected
   */
  success: boolean;

  /**
   * Phase of lifecycle reached
   */
  phase: StateChangePhase;

  /**
   * Metadata about the change
   */
  metadata: StateChangeMetadata;

  /**
   * Original value before change (for rollback)
   */
  originalValue?: T;

  /**
   * Sanitized value applied
   */
  sanitizedValue?: T;
}

/**
 * State change validation error
 */
export class StateValidationError extends Error {
  public readonly change: StateChange;
  public readonly errors: string[];

  constructor(change: StateChange, errors: string[]) {
    const message = `State validation failed for key '${change.key}': ${errors.join(', ')}`;
    super(message);
    this.name = 'StateValidationError';
    this.change = change;
    this.errors = errors;
  }
}

/**
 * Rollback strategy for state changes
 */
export interface RollbackStrategy {
  /**
   * Revert a state change to its original value.
   *
   * @param change - The StateChange to roll back
   * @returns Promise resolving to rollback result
   */
  rollback<T>(change: StateChange<T>): Promise<StateChangeResult<T>>;

  /**
   * Check if a change can be rolled back (depends on underlying storage)
   */
  canRollback(change: StateChange): boolean;
}

/**
 * State observer for reactive state management
 */
export interface StateObserver<T = unknown> {
  /**
   * Called when a state change is about to be applied.
   * Can veto the change by returning false.
   *
   * @param change - The pending state change
   * @returns True to allow change, false to veto
   */
  onBeforeChange?(change: StateChange<T>): boolean;

  /**
   * Called when a state change is completed successfully.
   *
   * @param result - The result of the change
   */
  onChange?(result: StateChangeResult<T>): void;

  /**
   * Called when a state change fails.
   *
   * @param result - The failed result
   */
  onError?(error: StateValidationError): void;
}
