/**
 * [LAYER: CORE]
 * Principle: Orchestration — coordinates system-wide communication (Events).
 */

import type { AgentEvent, EventSubscriber } from '../domain/Event';
import { EventType } from '../domain/Event';

export class EventBus {
  private subscribers: Map<EventType, EventSubscriber[]> = new Map();

  /**
   * Subscribes to events of a specific type.
   */
  subscribe(type: EventType, subscriber: EventSubscriber): void {
    const existing = this.subscribers.get(type) || [];
    this.subscribers.set(type, [...existing, subscriber]);
  }

  /**
   * Publishes an event to all interested subscribers.
   */
  publish<T>(type: EventType, payload: T, correlationId?: string): void {
    const event: AgentEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
      correlationId,
    };

    const targets = this.subscribers.get(type) || [];
    targets.forEach(s => s(event));
  }
}
