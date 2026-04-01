/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic — the heart of the application.
 */

import type { Reasoning } from '../memory/Reasoning';
import type { SystemEvent } from '../Event';

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
