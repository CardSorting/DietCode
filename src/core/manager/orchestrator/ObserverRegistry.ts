/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { 
  StateObserver, 
  StateChange, 
  StateChangeResult 
} from '../../../domain/state/StateChangeProtocol';
import { Logger } from '../../../shared/services/Logger';

/**
 * [LAYER: CORE / ORCHESTRATOR]
 * Manages the registration and notification of state observers.
 */
export class ObserverRegistry {
  private observers = new Map<string, Set<StateObserver<unknown>>>();
  private globalObservers = new Set<StateObserver<unknown>>();
  private maxObservers: number;

  constructor(maxObservers = 50) {
    this.maxObservers = maxObservers;
  }

  registerObserver(key: string, observer: StateObserver<unknown>): void {
    let observers = this.observers.get(key);
    if (!observers) {
      observers = new Set();
      this.observers.set(key, observers);
    }

    if (observers.size >= this.maxObservers) {
      throw new Error(`Maximum observer count reached for key: ${key}`);
    }

    observers.add(observer);
    Logger.info(`[STATE] Observer registered for key: ${key}`);
  }

  unregisterObserver(key: string, observer: StateObserver<unknown>): void {
    const observers = this.observers.get(key);
    if (observers) {
      observers.delete(observer);
      if (observers.size === 0) {
        this.observers.delete(key);
      }
    }
  }

  registerGlobalObserver(observer: StateObserver<unknown>): void {
    if (this.globalObservers.size >= this.maxObservers) {
      throw new Error("Maximum global observer count reached");
    }
    this.globalObservers.add(observer);
    Logger.info("[STATE] Global observer registered");
  }

  unregisterGlobalObserver(observer: StateObserver<unknown>): void {
    this.globalObservers.delete(observer);
  }

  /**
   * Triggers the onBeforeChange phase for all relevant observers.
   */
  async notifyBeforeChange<T>(change: StateChange<T>, validationErrors: string[]): Promise<boolean> {
    let canProceed = true;

    // Key-specific observers
    const observers = this.observers.get(change.key);
    if (observers) {
      for (const observer of observers) {
        try {
          if (observer.onBeforeChange) {
            const result = observer.onBeforeChange(change as StateChange<unknown>);
            if (!result) {
              validationErrors.push(`Observer rejected change for key '${change.key}'`);
              canProceed = false;
            }
          }
        } catch (error) {
          Logger.error('[STATE] Observer onBeforeChange error:', error);
        }
      }
    }

    // Global observers
    for (const observer of this.globalObservers) {
      try {
        if (observer.onBeforeChange) {
          const result = observer.onBeforeChange(change as StateChange<unknown>);
          if (!result) {
            validationErrors.push(`Global observer rejected change for key '${change.key}'`);
            canProceed = false;
          }
        }
      } catch (error) {
        Logger.error('[STATE] Global observer onBeforeChange error:', error);
      }
    }

    return canProceed;
  }

  /**
   * Triggers the onChange phase for all relevant observers.
   */
  async notifyChange<T>(change: StateChange<T>, result: StateChangeResult<T>): Promise<void> {
    const observers = this.observers.get(change.key);
    if (observers) {
      for (const observer of observers) {
        try {
          if (observer.onChange) {
            await observer.onChange(result as StateChangeResult<unknown>);
          }
        } catch (error) {
          Logger.error(`[STATE] Observer onChange error for key '${change.key}':`, error);
        }
      }
    }

    for (const observer of this.globalObservers) {
      try {
        if (observer.onChange) {
          await observer.onChange(result as StateChangeResult<unknown>);
        }
      } catch (error) {
        Logger.error(`[STATE] Global observer onChange error for key '${change.key}':`, error);
      }
    }
  }

  /**
   * Triggers atomic batch updates.
   */
  async notifyBatchChange(results: StateChangeResult<unknown>[]): Promise<void> {
    // 1. Notify global observers (Atomic Batch)
    for (const observer of this.globalObservers) {
      try {
        await observer.onBatchChange?.(results);
      } catch (error) {
        Logger.error('[STATE] Global observer onBatchChange error:', error);
      }
    }

    // 2. Notify individual observers (Fallback)
    for (const result of results) {
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

      // Notify global observers that don't support batches
      for (const observer of this.globalObservers) {
        if (!observer.onBatchChange && observer.onChange) {
          try {
            await observer.onChange(result);
          } catch (error) {
            Logger.error('[STATE] Global observer onChange fallback error:', error);
          }
        }
      }
    }
  }
}
