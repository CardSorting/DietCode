/**
 * [LAYER: CORE]
 * Principle: Orchestrate domain state mutations with decoherence management
 * Prework Status: Not applicable (new file)
 *
 * Orchestrates state change protocols with validation, debouncing, and caching.
 * Manages observer patterns for reactive state management.
 */

import {
  type RollbackStrategy,
  type StateChange,
  StateChangePhase,
  type StateChangeResult,
  type StateObserver,
} from '../../domain/state/StateChangeProtocol';

/**
 * State change precedence rules
 */
export interface PrecedenceRule {
  source: 'remote' | 'task' | 'session' | 'global';
  compare(): number;
}

/**
 * Precedence sources configuration
 */
export const PrecedenceSource = {
  GLOBAL: 'global',
  SESSION: 'session',
  TASK: 'task',
  REMOTE: 'remote',
} as const;

/**
 * State orchestration configuration
 */
export interface StateOrchestratorConfig {
  /** Default debounce delay in milliseconds */
  defaultDebounceDelay: number;

  /** Whether to log state changes */
  logChanges: boolean;

  /** Maximum number of observers */
  maxObservers: number;
}

/**
 * StateOrchestrator
 *
 * Orchestrates state changes by validating, sanitizing, and applying them.
 * Supports debouncing for writing, caching for model info, and predecessor logic.
 *
 * Key responsibilities:
 * - Validate state changes before persistence
 * - Sanitize values (type coercion, padding)
 * - Apply precedence rules for conflicts
 * - Trigger observers for reactive state management
 * - Enable debounced persistence for performance
 */
export class StateOrchestrator<T = unknown> {
  private static instance: StateOrchestrator<any> | null = null;
  private observers = new Map<string, StateObserver<unknown>>();
  private changesQueue = new Map<string, { newValue: unknown; dirty: boolean }>();
  private debounceTimeout: NodeJS.Timeout | null = null;

  private config: Required<StateOrchestratorConfig>;
  private rollbackStrategy: RollbackStrategy;
  private priorityRules: PrecedenceRule[];

  private constructor(config: StateOrchestratorConfig, rollbackStrategy?: RollbackStrategy) {
    this.config = {
      defaultDebounceDelay: config.defaultDebounceDelay || 500,
      logChanges: config.logChanges !== false,
      maxObservers: config.maxObservers || 50,
    };

    this.rollbackStrategy = rollbackStrategy || {
      rollback: async (change) => ({
        change,
        success: true,
        phase: StateChangePhase.COMPLETED,
        metadata: {
          timestamp: Date.now(),
          correlationId: change.getCorrelationId(),
          actor: 'system',
          source: 'automated',
        },
        originalValue: change.oldValue,
        sanitizedValue: change.oldValue,
      }),
      canRollback: () => true,
    };
    this.priorityRules = [];
  }

  /**
   * Get singleton instance
   */
  static getInstance<T = unknown>(
    config?: StateOrchestratorConfig,
    rollbackStrategy?: RollbackStrategy,
  ): StateOrchestrator<T> {
    if (!StateOrchestrator.instance) {
      StateOrchestrator.instance = new StateOrchestrator(
        config || {
          defaultDebounceDelay: 500,
          logChanges: true,
          maxObservers: 50,
        },
        rollbackStrategy,
      );
    }
    return StateOrchestrator.instance as any;
  }

  /**
   * Register an observer for a state key
   */
  registerObserver(key: string, observer: StateObserver): void {
    if (this.observers.size >= this.config.maxObservers) {
      throw new Error('Maximum observer count reached');
    }

    this.observers.set(key, observer);
    console.log(`✅ Observer registered for key: ${key}`);
  }

  /**
   * Remove observer for a state key
   */
  unregisterObserver(key: string): void {
    this.observers.delete(key);
  }

  /**
   * Add a precedence rule for conflict resolution
   */
  addPrecedenceRule(rule: PrecedenceRule): void {
    this.priorityRules.push(rule);
    this.priorityRules.sort((a, b) => a.compare() - b.compare());
  }

  /**
   * Apply a state change with validation, sanitizing, and persistence
   *
   * @param change - The state change to apply
   * @param debounceDelay - Delay before persistent write (0 = immediate)
   * @returns Result of the state change
   */
  async applyChange<T>(
    change: StateChange<T>,
    debounceDelay?: number,
  ): Promise<StateChangeResult<T>> {
    const delay = debounceDelay ?? this.config.defaultDebounceDelay;

    // Phase 1: Validate change
    const isValid = change.validate();
    const validationErrors: string[] = [];

    if (!isValid) {
      const message = `Validation failed for key '${change.key}'`;
      validationErrors.push(message);
      console.warn(`⚠️  ${message}: ${JSON.stringify(change.sanitize())}`);
    }

    // Notify observers onBeforeChange
    for (const [key, observer] of this.observers) {
      try {
        if (observer.onBeforeChange && key !== change.key) {
          const canProceed = observer.onBeforeChange(change);
          if (!canProceed) {
            validationErrors.push(`Observer rejected change for key '${key}'`);
            console.warn(`⚠️  Observer "${key}" rejected state change`);
          }
        }
      } catch (error: any) {
        console.error(`❌ Observer "${key}" triggered error:`, error);
      }
    }

    // Phase 2: Prepare result
    const sanitizedValue = change.sanitize();

    const result: StateChangeResult<T> = {
      change,
      success: false, // Initial state
      phase: StateChangePhase.VALIDATED,
      metadata: {
        timestamp: Date.now(),
        correlationId: change.getCorrelationId(),
        actor: 'system',
        source: 'automated',
        validationErrors,
      },
      originalValue: change.oldValue,
      sanitizedValue,
    };

    // If validation failed before change, return early
    if (validationErrors.length > 0) {
      return {
        ...result,
        phase: StateChangePhase.SANITIZED,
        success: false,
      };
    }

    // Phase 3: Persist change
    try {
      if (debounceDelay === 0 || FirestoreConfig.dryRun) {
        // Immediate write
        await this.persistChange(change, sanitizedValue);

        await this.notifyObservers(change, result);

        return {
          ...result,
          success: true,
          phase: StateChangePhase.COMPLETED,
        };
      }
      // Debounce the change
      this.schedulePersist(change, sanitizedValue, delay);

      return {
        ...result,
        success: false, // Pending
        phase: StateChangePhase.SANITIZED,
      };
    } catch (error: any) {
      console.error('❌ Failed to persist state change:', error);

      // Trigger rollback if strategy supports it
      if (this.rollbackStrategy.canRollback(change)) {
        try {
          await this.rollback(change);
        } catch (rollbackError: any) {
          console.error('❌ Rollback failed:', rollbackError);
        }
      }

      return {
        ...result,
        success: false,
        phase: StateChangePhase.ROLLBACK,
      };
    }
  }

  /**
   * Schedule a debounced persist
   */
  private schedulePersist<T>(change: StateChange<T>, value: T, delay: number): void {
    this.changesQueue.set(change.key, { newValue: value, dirty: true });

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(async () => {
      await this.flushDebouncedChanges();
    }, delay);
  }

  /**
   * Flush all pending debounced changes
   */
  private async flushDebouncedChanges(): Promise<void> {
    if (this.changesQueue.size === 0) {
      return;
    }

    const changesToPersist = Array.from(this.changesQueue.entries());
    this.changesQueue.clear();

    for (const [key, { newValue }] of changesToPersist) {
      const change = this.pendingChangesMap.get(key) as StateChange;
      if (change) {
        await this.persistChange(change, newValue);
        this.pendingChangesMap.delete(key);
      }
    }
  }

  /**
   * Notify all observers about a change
   */
  private async notifyObservers<T>(
    change: StateChange<T>,
    result: StateChangeResult<T>,
  ): Promise<void> {
    for (const [key, observer] of this.observers) {
      try {
        if (observer.onChange) {
          await observer.onChange(result as any);
        }
      } catch (error: any) {
        console.error(`❌ Observer "${key}" triggered onChange error:`, error);
      }
    }
  }

  /**
   * Persist a state change
   */
  private async persistChange<T>(change: StateChange<T>, value: T): Promise<void> {
    // This would be implemented by a concrete storage layer
    // For now, we'll use Firestore as a placeholder
    throw new Error('Persist change not implemented. Use StateRepository directly.');
  }

  /**
   * Rollback a state change
   */
  private async rollback<T>(change: StateChange<T>): Promise<void> {
    const rollbackResult = await this.rollbackStrategy.rollback(change);

    console.log(`🔄 Rollback completed: ${change.key}`);

    // Notify observers on rollback
    await this.notifyObservers(change, rollbackResult);
  }

  /**
   * Get current value from storage
   */
  async getValue<T>(key: string, defaultValue?: T): Promise<T> {
    // This would get from storage layer
    return defaultValue as T;
  }

  /**
   * Check if a change would be valid (without persisting)
   */
  validate<T>(change: StateChange<T>): boolean {
    return change.validate();
  }

  /**
   * Flush all debounced changes immediately
   */
  async forceFlush(): Promise<void> {
    await this.flushDebouncedChanges();
  }

  /**
   * Clear all pending changes
   */
  clearPending(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.changesQueue.clear();
    this.pendingChangesMap.clear();
  }

  private pendingChangesMap = new Map<string, any>();
}

/**
 * Simple Firestore-based storage for prototype
 *
 * NOTE: Replace with actual storage implementation in production
 */
const FirestoreConfig = {
  dryRun: process.env.DRY_RUN === 'true',
  collection: 'state_changes',
};

/**
 * Placeholder for Firestore functions
 */
async function getFirestore(): Promise<any> {
  return {};
}

async function firestoreSet<T>(key: string, value: T): Promise<void> {
  if (FirestoreConfig.dryRun) {
    console.log(`[DRY RUN] Firestore set: ${key}`);
    return;
  }

  const db = await getFirestore();
  console.log(`[STUB] Firestore set: ${key}`);
}
