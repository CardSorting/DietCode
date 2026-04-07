/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic — the heart of the application.
 */

import type { SystemEvent } from '../Event';
import type { Reasoning } from '../memory/Reasoning';

export interface AuditRecord {
  sessionId: string;
  agentId: string;
  action: string;
  reasoning: Reasoning;
  metadata: any;
}

export interface AuditProvider {
  /**
   * Persists a high-fidelity audit entry for an agent action.
   */
  recordAction(record: AuditRecord): Promise<void>;

  /**
   * Persists a system event for historical tracking.
   */
  recordEvent(event: SystemEvent): Promise<void>;
}
