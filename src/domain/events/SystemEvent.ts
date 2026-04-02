/**
 * [LAYER: DOMAIN]
 * Standardized system event data structure for DietCode lifecycle tracking.
 */

import { EventType } from './EventType';

/**
 * Optional metadata for events.
 */
export interface EventMetadata {
  sessionId?: string;
  agentId?: string;
  durationMs?: number;
  correlationId?: string;
  [key: string]: any;
}

/**
 * System event that can be published and listened to across the application.
 */
export interface SystemEvent {
  id: string;
  type: EventType;
  timestamp: string;
  data: Record<string, any>;
  metadata?: EventMetadata;
}