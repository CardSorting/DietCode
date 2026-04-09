/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Standardized system event types for DietCode lifecycle tracking.
 *
 * This module re-exports component types that exist elsewhere in the codebase.
 * All event-specific implementation details are in src/domain/events/.
 */

// Re-export EventType enum
export { EventType } from './events/EventType';

// Re-export SystemEvent interface
export type { SystemEvent, EventMetadata } from './events/SystemEvent';

// Event-related domain types
// Note: EventBus implementation resides in Core layer (orchestration/eventbus.ts)
