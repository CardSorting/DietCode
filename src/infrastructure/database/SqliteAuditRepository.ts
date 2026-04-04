import type { SystemEvent } from '../../domain/Event';
import type { AuditProvider, AuditRecord } from '../../domain/system/AuditProvider';
import { Core } from './sovereign/Core';

/**
 * [LAYER: INFRASTRUCTURE]
 * Concrete implementation of audit logging using BroccoliQ Hive.
 * High-fidelity action tracking with Write-Behind performance.
 */
export class SqliteAuditRepository implements AuditProvider {
  /**
   * Records a high-fidelity audit entry of an agent action.
   */
  async recordAction(record: AuditRecord): Promise<void> {
    const timestamp = Date.now();

    await Core.push({
      type: 'insert',
      table: 'audit_events',
      values: {
        id: globalThis.crypto.randomUUID(),
        userId: 'system', // DietCode uses sessionId as task context
        agentId: record.agentId,
        type: record.action,
        data: JSON.stringify({
          sessionId: record.sessionId,
          reasoning: record.reasoning,
          metadata: record.metadata,
        }),
        createdAt: timestamp,
      },
    });
  }

  /**
   * Records a system-wide event from the EventBus.
   */
  async recordEvent(event: SystemEvent): Promise<void> {
    await Core.push({
      type: 'insert',
      table: 'audit_events',
      values: {
        id: event.id,
        userId: event.metadata?.sessionId || 'system',
        agentId: event.metadata?.agentId || 'dietcode-core',
        type: `event:${event.type}`,
        data: JSON.stringify({
          ...event.data,
          _metadata: event.metadata,
        }),
        createdAt: new Date(event.timestamp).getTime(),
      },
    });
  }
}
