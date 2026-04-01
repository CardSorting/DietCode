/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Concrete implementation of audit logging using SQLite.
 */

import { SovereignDb } from './SovereignDb';
import type { Reasoning } from '../../domain/Reasoning';

export interface AuditRecord {
  id: string;
  sessionId: string;
  agentId: string;
  action: string;
  reasoning: Reasoning;
  metadata: any;
  timestamp: number;
}

export class SqliteAuditRepository {
  /**
   * Records a high-fidelity audit entry of an agent action.
   */
  async recordAction(record: Omit<AuditRecord, 'id' | 'timestamp'>): Promise<void> {
    const pool = await SovereignDb.getPool();
    const id = globalThis.crypto.randomUUID();
    const timestamp = Date.now();

    await pool.push({
      type: 'insert',
      table: 'audit_logs' as any,
      values: {
        id,
        sessionId: record.sessionId,
        agentId: record.agentId,
        action: record.action,
        reasoning: JSON.stringify(record.reasoning),
        metadata: JSON.stringify(record.metadata),
        timestamp,
      } as any,
    });
    
    await pool.flush();
  }
}
