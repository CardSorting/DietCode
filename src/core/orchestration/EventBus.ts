/**
 * [LAYER: CORE]
 * Central EventBus for system-wide lifecycle tracking and observability.
 * Uses structured logging for production-grade observability.
 */

import { EventEmitter } from 'node:events';
import type { EventType, SystemEvent } from '../../domain/Event';
import { LogLevel } from '../../domain/logging/LogLevel';
import type { LogService } from '../../domain/logging/LogService';

export class EventBus {
  private static instance?: EventBus;
  private emitter: EventEmitter = new EventEmitter();
  private logService: LogService;

  private constructor(logService: LogService) {
    this.emitter.setMaxListeners(100);
    this.logService = logService;
  }

  static getInstance(logService: LogService): EventBus;
  static getInstance(): EventBus;
  static getInstance(logService?: LogService): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus(
        logService ||
          new Proxy({} as any, {
            get: () => () => {},
          }),
      );
    }
    return EventBus.instance;
  }

  /**
   * Injects a log service for structured logging output.
   */
  static setLogService(logService: LogService): void {
    if (EventBus.instance) {
      EventBus.instance.logService = logService;
    }
  }

  /**
   * Dispatches an event to all listeners.
   * Logs structured event data for observability.
   */
  emit(
    type: EventType,
    data: Record<string, any> = {},
    metadata: SystemEvent['metadata'] = {},
  ): void {
    const event: SystemEvent = {
      id: globalThis.crypto.randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      data,
      metadata,
    };

    // Emit event to listeners
    this.emitter.emit(type, event);
    this.emitter.emit('*', event);

    // Log structured event for observability
    this.logService.info(
      `${type} event emitted`,
      { id: event.id, data },
      {
        component: 'EventBus',
        correlationId: metadata?.correlationId,
        sessionId: metadata?.sessionId,
      },
    );
  }

  /**
   * Subscribes to a specific event type.
   */
  on(type: EventType | '*', listener: (event: SystemEvent) => void): void {
    this.emitter.on(type, listener);
  }

  /**
   * Removes event listener for cleanup.
   */
  off(type: EventType | '*', listener: (event: SystemEvent) => void): void {
    this.emitter.off(type, listener);
  }

  /**
   * Internal method to emit temporary event for logging without triggering all listeners.
   */
  private temporaryEmit(type: EventType, data: Record<string, any>): void {
    this.logService.debug(`${type} event received (temporary)`, data, { component: 'EventBus' });
  }
  /**
   * Alias for emit for backward compatibility.
   */
  publish(
    type: EventType,
    data: Record<string, any> = {},
    metadata: SystemEvent['metadata'] = {},
  ): void {
    this.emit(type, data, metadata);
  }
}
