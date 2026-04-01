/**
 * [LAYER: CORE]
 * Central EventBus for system-wide lifecycle tracking and observability.
 */

import { EventEmitter } from 'events';
import type { SystemEvent, EventType } from '../domain/Event';

export class EventBus {
  private static instance: EventBus;
  private emitter: EventEmitter = new EventEmitter();

  private constructor() {
    this.emitter.setMaxListeners(100);
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Dispatches an event to all listeners.
   */
  emit(type: EventType, data: Record<string, any> = {}, metadata: SystemEvent['metadata'] = {}): void {
    const event: SystemEvent = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      data,
      metadata,
    };
    
    console.log(`[EVENT: ${type}] ${JSON.stringify(data)}`);
    this.emitter.emit(type, event);
    this.emitter.emit('*', event);
  }

  /**
   * Subscribes to a specific event type.
   */
  on(type: EventType | '*', listener: (event: SystemEvent) => void): void {
    this.emitter.on(type, listener);
  }

  /**
   * Simple off method for cleanup.
   */
  off(type: EventType | '*', listener: (event: SystemEvent) => void): void {
    this.emitter.off(type, listener);
  }
}
