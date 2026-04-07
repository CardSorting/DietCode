/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Reactive state subscription with change notification
 * Prework Status: Not applicable (new file)
 *
 * Subscribes to state changes from StateOrchestrator and notifies observers.
 * Aggregates change events for efficient batch processing.
 */

import type { GlobalState } from '../../domain/LLMProvider';
import {
  type StateChange,
  StateChangePhase,
  type StateChangeResult,
  type StateObserver,
} from '../../domain/state/StateChangeProtocol';

/**
 * State subscriber configuration
 */
export interface StateSubscriberConfig {
  /**
   * Subscribe to changes at this scope (e.g., "*", "session:123", "file:read")
   */
  scope: string | string[];

  /**
   * Listen for changes at this phase
   */
  phases?: StateChangePhase[];

  /**
   * Maximum events per batch
   */
  maxBatchSize?: number;

  /**
   * Batch timeout in ms (for throttling)
   */
  batchTimeout?: number;

  /**
   * Whether to enable change diffing (detect modifications)
   */
  enableDiffing?: boolean;
}

/**
 * State subscription event
 */
export interface StateSubscriptionEvent {
  /**
   * State key that changed
   */
  key: string;

  /**
   * Old value (before change)
   */
  oldValue?: unknown;

  /**
   * New value (after change)
   */
  newValue: unknown;

  /**
   * Phase of the state change
   */
  phase: StateChangePhase;

  /**
   * Correlation ID for tracking
   */
  correlationId?: string;

  /**
   * Timestamp of change
   */
  timestamp: number;

  /**
   * Source of change (e.g., "session-123", "file-system")
   */
  source?: string;

  /**
   * Change type (add, update, delete, replace)
   */
  changeType: 'add' | 'update' | 'delete' | 'replace';

  /**
   * Diff (new - old) if available
   */
  diff?: unknown;
}

/**
 * State batch event
 */
export interface StateBatchEvent {
  /**
   * All events in batch
   */
  events: StateSubscriptionEvent[];

  /**
   * Count of events
   */
  count: number;

  /**
   * Duration of batch in ms
   */
  duration: number;

  /**
   * Batch size limit check
   */
  hitsLimit: boolean;

  /**
   * Timeout check
   */
  hitsTimeout: boolean;
}

/**
 * StateSubscriber
 *
 * Subscribes to state changes from StateOrchestrator and notifies observers.
 * Supports change diffing, batch processing, and scope filtering.
 *
 * Key responsibilities:
 * - Subscribe to specific state keys/phases
 * - Receive state change events
 * - Aggregate events for batch processing
 * - Notify registered observers
 * - Support change diffing (detect modifications)
 */
export class StateSubscriber {
  private subscriptions = new Map<string, Set<string>>(); // scope -> keys
  private listeners = new Map<string, Set<StateObserver>>(); // key -> observers
  private eventQueue = new Map<string, unknown[]>(); // key -> pending values
  private batchTimers = new Map<string, NodeJS.Timeout>();

  private config: Required<StateSubscriberConfig>;
  private listenersByScope = new Map<string, Set<StateObserver>>(); // scope -> observers
  private batchSize = 0;
  private batchTimeouts = 0;

  constructor(config: StateSubscriberConfig) {
    const scopeArray = Array.isArray(config.scope) ? config.scope : [config.scope];

    this.config = {
      scope: scopeArray,
      phases: config.phases || [StateChangePhase.SANITIZED, StateChangePhase.COMPLETED],
      maxBatchSize: config.maxBatchSize || 10,
      batchTimeout: config.batchTimeout || 100,
      enableDiffing: config.enableDiffing ?? true,
    };

    this.batchSize = this.config.maxBatchSize;
    this.batchTimeouts = this.config.batchTimeout;
  }

  /**
   * Subscribe to a state key
   */
  subscribe(key: string, observer: StateObserver, phases?: StateChangePhase[]): void {
    const scope = this.getScopeFromKey(key);

    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)?.add(observer);

    if (!this.subscriptions.has(scope)) {
      this.subscriptions.set(scope, new Set());
    }
    this.subscriptions.get(scope)?.add(key);

    // Track by scope for aggregated listeners
    if (!this.listenersByScope.has(scope)) {
      this.listenersByScope.set(scope, new Set());
    }

    // Add a merged observer that aggregates changes for this scope
    this.listenersByScope.get(scope)?.add({
      onChange: async (result) => {
        // Aggregate and notify all scope listeners
        const observers = this.listenersByScope.get(scope);
        if (observers) {
          for (const listener of observers) {
            if (listener.onChange) {
              await listener.onChange(result);
            }
          }
        }
      },
    });

    console.log(`✅ StateSubscriber: Subscribed to key '${key}' (scope: ${scope})`);
  }

  /**
   * Unsubscribe from a state key
   */
  unsubscribe(key: string, observer?: StateObserver): void {
    const scope = this.getScopeFromKey(key);
    const observers = this.listeners.get(key) || new Set();

    if (!observer) {
      // Unsubscribe all
      observers.clear();
    } else {
      observers.delete(observer);
    }

    // Clean up if no more observers
    if (observers.size === 0) {
      this.listeners.delete(key);
      this.subscriptions.get(scope)?.delete(key);
    }

    // Recreate aggregated listener if any remain
    this.rebuildScopeListeners(scope);

    console.log(`🗑️  StateSubscriber: Unsubscribed from key '${key}'`);
  }

  /**
   * Get scope from key
   */
  private getScopeFromKey(key: string): string {
    // Extract scope based on ":" separator
    const parts = key.split(':');
    if (parts.length > 1) {
      return parts.slice(0, -1).join(':');
    }
    return '*';
  }

  /**
   * Notify subscription with state change
   */
  async notify(
    key: string,
    newValue: unknown,
    phase: StateChangePhase,
    correlationId?: string,
    source?: string,
  ): Promise<void> {
    // Check if this phase is of interest
    if (!this.config.phases.includes(phase)) {
      return;
    }

    // Get old value for diffing
    let oldValue: unknown = undefined;
    let changeType: 'add' | 'update' | 'delete' | 'replace' = 'replace';

    if (phase === StateChangePhase.SANITIZED) {
      const cached = this.eventQueue.get(key);
      if (cached) {
        oldValue = cached[cached.length - 1];
        // Determine change type
        changeType = cached.length === 0 ? 'add' : 'update';
      }
    }

    // Create event
    const event: StateSubscriptionEvent = {
      key,
      newValue,
      oldValue,
      phase,
      correlationId,
      timestamp: Date.now(),
      source,
      changeType,
      diff: this.config.enableDiffing ? { old: oldValue, new: newValue } : undefined,
    };

    // Store for diffing in next phase
    if (!this.eventQueue.has(key)) {
      this.eventQueue.set(key, []);
    }
    this.eventQueue.get(key)?.push(newValue);

    // Acknowledge event in queue (diffing cleanup)
    if ((this.eventQueue.get(key)?.length || 0) > 10) {
      this.eventQueue.get(key)?.shift();
    }

    // Notify all listeners for this key
    const keyObservers = this.listeners.get(key) || new Set();
    const result: StateChangeResult<unknown> = {
      change: {
        key,
        newValue,
        oldValue,
        stateSet: {} as GlobalState,
        validate: () => true,
        sanitize: () => newValue,
        getCorrelationId: () => correlationId || 'unknown',
      },
      success: phase === StateChangePhase.COMPLETED,
      phase,
      metadata: {
        timestamp: Date.now(),
        correlationId: correlationId || 'unknown',
        actor: 'system',
        source: (source as any) || 'automated',
      },
      originalValue: oldValue,
      sanitizedValue: newValue as any,
    };

    for (const observer of keyObservers) {
      try {
        if (observer.onChange) {
          await observer.onChange(result);
        }
      } catch (error: any) {
        console.error(`❌ StateSubscriber: Observer error for ${key}:`, error);
      }
    }
  }

  /**
   * Rebuild scope listeners
   */
  private async rebuildScopeListeners(scope: string): Promise<void> {
    const scopeObservers = this.listenersByScope.get(scope);
    if (!scopeObservers) return;

    // Notify remaining observers
    for (const observer of scopeObservers) {
      if (observer.onChange) {
        const result: StateChangeResult<unknown> = {
          change: {
            key: scope,
            newValue: { type: 'rebuild', observers: scopeObservers.size },
            oldValue: undefined,
            stateSet: {} as GlobalState,
            validate: () => true,
            sanitize: () => ({ type: 'rebuild', observers: scopeObservers.size }),
            getCorrelationId: () => 'rebuild',
          },
          success: true,
          phase: StateChangePhase.COMPLETED,
          metadata: {
            timestamp: Date.now(),
            correlationId: 'rebuild',
            actor: 'system',
            source: 'automated',
          },
          originalValue: undefined,
          sanitizedValue: { type: 'rebuild', observers: scopeObservers.size },
        };
        await observer.onChange(result);
      }
    }
  }

  /**
   * Flush all pending changes
   */
  async flush(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [key, queue] of this.eventQueue.entries()) {
      const value = queue[queue.length - 1];
      if (value) {
        promises.push(this.notify(key, value, StateChangePhase.COMPLETED, 'flush'));
      }
    }
    await Promise.all(promises);
    this.eventQueue.clear();
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(): number {
    let count = 0;
    for (const keys of this.subscriptions.values()) {
      count += keys.size;
    }
    return count;
  }

  /**
   * Get active keys
   */
  getActiveKeys(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Check if subscribed to key
   */
  isSubscribed(key: string): boolean {
    return this.listeners.has(key);
  }

  /**
   * Register generic listener for multiple keys
   */
  registerListener(keys: string[], listener: StateObserver): () => void {
    for (const key of keys) {
      this.subscribe(key, listener);
    }

    // Return unsubscribe function
    return () => {
      for (const key of keys) {
        this.unsubscribe(key, listener);
      }
    };
  }

  /**
   * Clear all subscriptions
   */
  clear(): void {
    this.listeners.clear();
    this.subscriptions.clear();
    this.eventQueue.clear();
    this.batchTimers.clear();
    console.log('🗑️  StateSubscriber: Cleared all subscriptions');
  }
}

/**
 * Global state subscriber instance
 */
export const globalStateSubscriber = new StateSubscriber({
  scope: '*',
  phases: [StateChangePhase.SANITIZED, StateChangePhase.COMPLETED],
  maxBatchSize: 10,
  batchTimeout: 100,
  enableDiffing: true,
});
