/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { 
  StateChange, 
  StateChangeResult 
} from '../../../domain/state/StateChangeProtocol';
import { StateChangePhase } from '../../../domain/state/StateChangeProtocol';
import { Logger } from '../../../shared/services/Logger';

/**
 * [LAYER: CORE / ORCHESTRATOR]
 * Handles debouncing and batch processing of state changes.
 */
export class BatchProcessor {
  private changesQueue = new Map<string, { change: StateChange<unknown>; newValue: unknown }>();
  private debounceTimeout: NodeJS.Timeout | null = null;
  private defaultDelay: number;

  constructor(defaultDelay = 100) {
    this.defaultDelay = defaultDelay;
  }

  /**
   * Adds a change to the debounced queue.
   */
  enqueue<T>(
    change: StateChange<T>, 
    value: T, 
    delay: number, 
    onFlush: () => Promise<void>
  ): void {
    this.changesQueue.set(change.key, { 
      change: change as StateChange<unknown>, 
      newValue: value 
    });

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(async () => {
      this.debounceTimeout = null;
      await onFlush();
    }, delay || this.defaultDelay);
  }

  /**
   * Adds a change for batch processing with a sticky timeout (first one wins or resets?).
   * In the original implementation, schedulePersistBatch only set the timeout if NOT already set.
   */
  enqueueBatch<T>(
    change: StateChange<T>, 
    value: T, 
    delay: number, 
    onFlush: () => Promise<void>
  ): void {
    this.changesQueue.set(change.key, { 
      change: change as StateChange<unknown>, 
      newValue: value 
    });

    if (!this.debounceTimeout) {
      this.debounceTimeout = setTimeout(async () => {
        this.debounceTimeout = null;
        await onFlush();
      }, delay || this.defaultDelay);
    }
  }

  /**
   * Clears the queue and returns the items for processing.
   */
  drain(): [string, { change: StateChange<unknown>; newValue: unknown }][] {
    const changes = Array.from(this.changesQueue.entries());
    this.changesQueue.clear();
    return changes;
  }

  get size(): number {
    return this.changesQueue.size;
  }

  cancelDebounce(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
  }
}
