/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Standardized system event data structure for DietCode lifecycle tracking.
 */

import type { EventType } from './EventType';

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
