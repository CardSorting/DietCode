/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure Business Logic — Event payload contracts for architecture changes
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ Type-safe; no external dependencies
 *   - Dependency Flow: ✅ Pure Domain, chain-based
 * Triaging:
 *   - [FINALIZE] Integration in Core Orchestrator relies on these types
 */

export type ArchitecturalEventType =
  | 'BLOCKED_BY_LEAK'
  | 'APPROVED_MOVE'
  | 'FORCE_OVERRIDE'
  | 'INITIATING_MOVE'
  | 'MOVE_FAILED'
  | 'HEALING_ENQUEUED';

export interface ArchitecturalViolation {
  type: string;
  message: string;
  file?: string;
  suggestedPath?: string;
}

import type { IntegrityViolation } from '../memory/Integrity';

export interface ArchitectureEvent {
  type: ArchitecturalEventType;
  timestamp: string;
  oldPath: string;
  newPath: string;
  violations?: IntegrityViolation[];
  oldArchScore?: number;
  newArchScore?: number;
  scoreChange?: number;
  metadata?: Record<string, unknown>;
}

export interface MoveOptions {
  force?: boolean;
  onEvent?: (event: ArchitectureEvent) => void;
}
