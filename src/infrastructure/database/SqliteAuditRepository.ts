/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Concrete implementation of audit logging using SQLite.
 */

import { SovereignDb } from './SovereignDb';
import type { Reasoning } from '../../domain/Reasoning';
import { EventBus } from '../../core/EventBus';
import type { SystemEvent } from '../../domain/Event';

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
   * Initializes the repository by subscribing to the EventBus.
   */
  initialize(): void {
    const eventBus = EventBus.getInstance();
    eventBus.on('*', (event) => {
      this.recordEvent(event).catch(err => console.error('[INFRA] Failed to persist event', err));
    });
  }

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

  /**
   * Records a system-wide event from the EventBus.
   */
  async recordEvent(event: SystemEvent): Promise<void> {
    const pool = await SovereignDb.getPool();
    
    // Using the same audit_logs table but with 'system_event' as action
    await pool.push({
      type: 'insert',
      table: 'audit_logs' as any,
      values: {
        id: event.id,
        sessionId: event.metadata?.sessionId || 'system',
        agentId: event.metadata?.agentId || 'dietcode-core',
        action: `event:${event.type}`,
        reasoning: '[]',
        metadata: JSON.stringify({
          ...event.data,
          _metadata: event.metadata,
        }),
        timestamp: new Date(event.timestamp).getTime(),
      } as any,
    });
    
    // We don't flush every time for performance, BufferedDbPool handles it
  }
}
