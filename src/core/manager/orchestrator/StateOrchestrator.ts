/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {
  type RollbackStrategy,
  type StateChange,
  StateChangePhase,
  type StateChangeResult,
  type StateObserver,
} from '../../../domain/state/StateChangeProtocol';
import { Logger } from '../../../shared/services/Logger';
import type { GlobalStateAndSettings } from '../../../shared/storage/state-keys';
import { ObserverRegistry } from './ObserverRegistry';
import { PersistenceService } from './PersistenceService';
import { BatchProcessor } from './BatchProcessor';

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
  defaultDebounceDelay: number;
  logChanges: boolean;
  maxObservers: number;
}

/**
 * [LAYER: CORE / ORCHESTRATOR]
 * The Facade for DietCode's state management system.
 * 
 * DESIGN: Orchestrates specialized services (ObserverRegistry, PersistenceService, BatchProcessor)
 * to provide a unified transactional state interface.
 */
export class StateOrchestrator<T = unknown> {
  private static instance: StateOrchestrator<unknown> | null = null;
  
  private observers: ObserverRegistry;
  private persistence: PersistenceService;
  private batch: BatchProcessor;
  
  private config: Required<StateOrchestratorConfig>;
  private rollbackStrategy: RollbackStrategy;
  private priorityRules: PrecedenceRule[] = [];

  private constructor(config: StateOrchestratorConfig, rollbackStrategy?: RollbackStrategy) {
    this.config = {
      defaultDebounceDelay: config.defaultDebounceDelay || 100,
      logChanges: config.logChanges !== false,
      maxObservers: config.maxObservers || 50,
    };

    this.observers = new ObserverRegistry(this.config.maxObservers);
    this.persistence = new PersistenceService();
    this.batch = new BatchProcessor(this.config.defaultDebounceDelay);

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
  }

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
    return StateOrchestrator.instance as unknown as StateOrchestrator<T>;
  }

  // --- Observer Management Delegation ---

  registerObserver(key: string, observer: StateObserver<unknown>): void {
    this.observers.registerObserver(key, observer);
  }

  registerGlobalObserver(observer: StateObserver<unknown>): void {
    this.observers.registerGlobalObserver(observer);
  }

  unregisterObserver(key: string, observer: StateObserver<unknown>): void {
    this.observers.unregisterObserver(key, observer);
  }

  unregisterGlobalObserver(observer: StateObserver<unknown>): void {
    this.observers.unregisterGlobalObserver(observer);
  }

  /**
   * Add a precedence rule for conflict resolution
   */
  addPrecedenceRule(rule: PrecedenceRule): void {
    this.priorityRules.push(rule);
    this.priorityRules.sort((a, b) => a.compare() - b.compare());
  }

  // --- Persistence Delegation ---

  async getState<U>(key: string): Promise<U | undefined> {
    return this.persistence.getState<U>(key);
  }

  async getValue<U>(key: string, defaultValue?: U): Promise<U | undefined> {
    return this.persistence.getValue<U>(key, defaultValue);
  }

  async getStateSnapshot(): Promise<GlobalStateAndSettings> {
    return this.persistence.getStateSnapshot();
  }

  // --- Core Lifecycle Logic ---

  async applyChange<U>(
    change: StateChange<U>,
    debounceDelay?: number,
  ): Promise<StateChangeResult<U>> {
    const delay = debounceDelay ?? this.config.defaultDebounceDelay;
    const validationErrors: string[] = [];

    // 1. Validation Logic
    if (!change.validate()) {
      validationErrors.push(`Validation failed for key '${change.key}'`);
    }

    // 2. Observer Hooks Phase (Before)
    const canProceed = await this.observers.notifyBeforeChange(change, validationErrors);

    const sanitizedValue = change.sanitize();
    const result: StateChangeResult<U> = {
      change,
      success: false,
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

    if (validationErrors.length > 0) {
      return { ...result, phase: StateChangePhase.SANITIZED, success: false };
    }

    // 3. Persistence & Signaling Phase
    try {
      if (delay === 0) {
        await this.persistence.persistChange(change, sanitizedValue);
        await this.observers.notifyChange(change, result);

        return { ...result, success: true, phase: StateChangePhase.COMPLETED };
      }

      this.batch.enqueue(change, sanitizedValue, delay, () => this.flushDebouncedChanges());

      return { ...result, success: true, phase: StateChangePhase.SANITIZED };
    } catch (error) {
      Logger.error('[STATE] Persistence error:', error);
      if (this.rollbackStrategy.canRollback(change)) {
        await this.rollback(change);
      }
      return { ...result, success: false, phase: StateChangePhase.ROLLBACK };
    }
  }

  async applyChanges(
    changes: StateChange<unknown>[],
    debounceDelay?: number
  ): Promise<StateChangeResult<unknown>[]> {
    const delay = debounceDelay ?? this.config.defaultDebounceDelay;
    const results: StateChangeResult<unknown>[] = [];

    for (const change of changes) {
      if (!change.validate()) {
        throw new Error(`Validation failed for key: ${change.key}`);
      }
    }

    for (const change of changes) {
      const sanitizedValue = change.sanitize();
      const result: StateChangeResult<unknown> = {
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
        await this.persistence.persistChange(change, sanitizedValue);
        result.phase = StateChangePhase.COMPLETED;
      } else {
        this.batch.enqueueBatch(change, sanitizedValue, delay, () => this.flushDebouncedChanges());
      }
      results.push(result);
    }

    await this.observers.notifyBatchChange(results);
    return results;
  }

  async forceFlush(): Promise<void> {
    await this.flushDebouncedChanges();
  }

  private async flushDebouncedChanges(): Promise<void> {
    const changes = this.batch.drain();
    if (changes.length === 0) return;

    for (const [key, { change, newValue }] of changes) {
      try {
        await this.persistence.persistChange(change, newValue);
        
        const result: StateChangeResult<unknown> = {
          change,
          success: true,
          phase: StateChangePhase.COMPLETED,
          metadata: {
            timestamp: Date.now(),
            correlationId: change.getCorrelationId(),
            actor: 'system',
            source: 'automated',
          },
          sanitizedValue: newValue as unknown,
        };

        await this.observers.notifyChange(change, result);
        Logger.info(`[STATE] Debounced change for '${key}' persisted.`);
      } catch (error) {
        Logger.error(`[STATE] Flush error for '${key}':`, error);
      }
    }
  }

  private async rollback<U>(change: StateChange<U>): Promise<void> {
    const rollbackResult = await this.rollbackStrategy.rollback(change);
    await this.observers.notifyChange(change, rollbackResult);
  }
}
