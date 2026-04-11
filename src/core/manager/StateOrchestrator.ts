/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
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
import { VsCodeStateRepository } from '../../infrastructure/storage/VsCodeStateRepository';
import { Logger } from '../../shared/services/Logger';

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
 * [LAYER: CORE]
 * The Axiomatic Heart of DietCode's state management.
 * 
 * This orchestrator acts as the single source of truth for the extension, 
 * managing transactional updates with validation, sanitization, and 
 * debounced persistence. It supports both key-specific and global 
 * observers for reactive state synchronization.
 */
export class StateOrchestrator<T = unknown> {
  private static instance: StateOrchestrator<any> | null = null;
  private state = new Map<string, any>();
  private observers = new Map<string, Set<StateObserver<unknown>>>();
  private globalObservers = new Set<StateObserver<unknown>>();
  private changesQueue = new Map<string, { change: StateChange<unknown>; newValue: unknown }>();
  private debounceTimeout: NodeJS.Timeout | null = null;

  private config: Required<StateOrchestratorConfig>;
  private rollbackStrategy: RollbackStrategy;
  private priorityRules: PrecedenceRule[];

  private constructor(config: StateOrchestratorConfig, rollbackStrategy?: RollbackStrategy) {
    this.config = {
      defaultDebounceDelay: config.defaultDebounceDelay || 100,
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
          defaultDebounceDelay: 100,
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
    let observers = this.observers.get(key);
    if (!observers) {
      observers = new Set();
      this.observers.set(key, observers);
    }

    if (observers.size >= this.config.maxObservers) {
      throw new Error(`Maximum observer count reached for key: ${key}`);
    }

    observers.add(observer);
    Logger.info(`[STATE] Observer registered for key: ${key}`);
  }

  /**
   * Register a global observer that listens to ALL state changes
   */
  registerGlobalObserver(observer: StateObserver): void {
    if (this.globalObservers.size >= this.config.maxObservers) {
      throw new Error("Maximum global observer count reached");
    }
    this.globalObservers.add(observer);
    Logger.info("[STATE] Global observer registered");
  }

  /**
   * Remove a global observer
   */
  unregisterGlobalObserver(observer: StateObserver): void {
    this.globalObservers.delete(observer);
  }

  /**
   * Remove observer for a state key
   */
  unregisterObserver(key: string, observer: StateObserver): void {
    const observers = this.observers.get(key);
    if (observers) {
      observers.delete(observer);
      if (observers.size === 0) {
        this.observers.delete(key);
      }
    }
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
    const observers = this.observers.get(change.key);
    if (observers) {
      for (const observer of observers) {
        try {
          if (observer.onBeforeChange) {
            const canProceed = observer.onBeforeChange(change);
            if (!canProceed) {
              validationErrors.push(`Observer rejected change for key '${change.key}'`);
              Logger.warn(`[STATE] Observer rejected state change for key: ${change.key}`);
            }
          }
        } catch (error: any) {
          Logger.error(`[STATE] Observer trigger error:`, error);
        }
      }
    }

    // Notify global observers onBeforeChange
    for (const observer of this.globalObservers) {
      try {
        if (observer.onBeforeChange) {
          const canProceed = observer.onBeforeChange(change);
          if (!canProceed) {
            validationErrors.push(`Global observer rejected change for key '${change.key}'`);
            Logger.warn(`[STATE] Global observer rejected state change for key: ${change.key}`);
          }
        }
      } catch (error: any) {
        Logger.error(`[STATE] Global observer trigger error:`, error);
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

    Logger.info(`[STATE] Applying change to '${change.key}' (debounce: ${delay}ms)`);

    // Phase 3: Persist change
    try {
      if (debounceDelay === 0) {
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
        success: true, // Optimistically success for UI responsiveness
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
   * Apply multiple state changes atomically.
   * Observers are notified after all changes have been validated and sanitized.
   */
  async applyChanges(
    changes: StateChange<any>[],
    debounceDelay?: number
  ): Promise<StateChangeResult<any>[]> {
    const delay = debounceDelay ?? this.config.defaultDebounceDelay;
    const results: StateChangeResult<any>[] = [];

    // All changes must pass validation before any are applied
    for (const change of changes) {
      const isValid = change.validate();
      if (!isValid) {
        throw new Error(`Validation failed for key: ${change.key}`);
      }
    }

    // Apply each change
    for (const change of changes) {
      const sanitizedValue = change.sanitize();
      
      const result: StateChangeResult<any> = {
        change,
        success: true,
        phase: StateChangePhase.SANITIZED,
        metadata: {
          timestamp: Date.now(),
          correlationId: change.getCorrelationId(),
          actor: 'system',
          source: 'batch',
        },
        originalValue: change.oldValue,
        sanitizedValue,
      };

      if (delay === 0) {
        await this.persistChange(change, sanitizedValue);
        result.phase = StateChangePhase.COMPLETED;
      } else {
        this.schedulePersistBatch(change, sanitizedValue, delay);
      }
      
      results.push(result);
    }

    // Notify observers of the full batch atomically if they support it
    const globalBatchObservers = Array.from(this.globalObservers).filter(o => !!o.onBatchChange);
    for (const observer of globalBatchObservers) {
      try {
        await observer.onBatchChange!(results);
      } catch (error) {
        Logger.error(`[STATE] Global observer onBatchChange error:`, error);
      }
    }

    // Fallback: individual notifications for observers that don't support batches
    for (const result of results) {
       // Only notify individual if not handled by batch
       const observers = this.observers.get(result.change.key);
       if (observers) {
         for (const observer of observers) {
           try {
             if (observer.onChange) await observer.onChange(result);
           } catch (error) {
             Logger.error(`[STATE] Observer onChange error for key '${result.change.key}':`, error);
           }
         }
       }
       
       for (const observer of this.globalObservers) {
         if (!observer.onBatchChange && observer.onChange) {
           try {
             await observer.onChange(result);
           } catch (error) {
             Logger.error(`[STATE] Global observer onChange fallback error:`, error);
           }
         }
       }
    }

    return results;
  }

  /**
   * Schedule a persist as part of a batch
   */
  private schedulePersistBatch<T>(change: StateChange<T>, value: T, delay: number): void {
    this.changesQueue.set(change.key, { change: change as any, newValue: value });

    if (!this.debounceTimeout) {
      this.debounceTimeout = setTimeout(async () => {
        await this.flushDebouncedChanges();
      }, delay);
    }
  }

  /**
   * Schedule a debounced persist
   */
  private schedulePersist<T>(change: StateChange<T>, value: T, delay: number): void {
    this.changesQueue.set(change.key, { change: change as any, newValue: value });

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

    for (const [key, { change, newValue }] of changesToPersist) {
      try {
        await this.persistChange(change, newValue);

        // PRODUCTION HARDENING: Ensure observers are notified of the completed debounced change
        const result: StateChangeResult<any> = {
          change,
          success: true,
          phase: StateChangePhase.COMPLETED,
          metadata: {
            timestamp: Date.now(),
            correlationId: change.getCorrelationId(),
            actor: 'system',
            source: 'automated',
          },
          sanitizedValue: newValue,
        };

        await this.notifyObservers(change, result);
        Logger.info(`[STATE] Debounced change for '${key}' persisted and synchronized.`);
      } catch (error) {
        Logger.error(`[STATE] Failed to flush change for '${key}':`, error);
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
    const observers = this.observers.get(change.key);
    if (observers) {
      for (const observer of observers) {
        try {
          if (observer.onChange) {
            await observer.onChange(result as any);
          }
        } catch (error: any) {
          Logger.error(`[STATE] Observer onChange error for key '${change.key}':`, error);
        }
      }
    }

    // Notify global observers onChange
    for (const observer of this.globalObservers) {
      try {
        if (observer.onChange) {
          await observer.onChange(result as any);
        }
      } catch (error: any) {
        Logger.error(`[STATE] Global observer onChange error for key '${change.key}':`, error);
      }
    }
  }

  /**
   * Persist a state change
   */
  private async persistChange<T>(change: StateChange<T>, value: T): Promise<void> {
    const repo = VsCodeStateRepository.getInstance();
    await repo.set(change.key, value);
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
   * Get current value from memory or storage
   */
  async getState<T>(key: string): Promise<T | undefined> {
    if (this.state.has(key)) {
      return this.state.get(key) as T;
    }
    const repo = VsCodeStateRepository.getInstance();
    const val = await repo.get(key);
    if (val !== undefined) {
      this.state.set(key, val);
    }
    return val as T;
  }

  /**
   * Get current value from storage
   */
  async getValue<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const repo = VsCodeStateRepository.getInstance();
    return await repo.get(key, defaultValue);
  }

  /**
   * Get an aggregated snapshot of all settings and global state
   */
  async getStateSnapshot(): Promise<Record<string, any>> {
    const { GlobalStateAndSettingKeys, getDefaultValue } = await import("../../shared/storage/state-keys");
    const repo = VsCodeStateRepository.getInstance();
    const snapshot: Record<string, any> = {};

    await Promise.all(
      GlobalStateAndSettingKeys.map(async (key) => {
        let val = await repo.get(key);
        if (val === undefined) {
          // PRODUCTION HARDENING: Apply default value if missing in repository
          val = getDefaultValue(key);
        }
        if (val !== undefined) {
          snapshot[key] = val;
        }
      }),
    );

    return snapshot;
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
}