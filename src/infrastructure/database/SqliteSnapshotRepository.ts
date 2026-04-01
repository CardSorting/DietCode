/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Persists file biological state (Snapshots) to BroccoliDB.
 */

import { SovereignDb } from './SovereignDb';
import type { Snapshot, SnapshotRepository } from '../../domain/Snapshot';

export class SqliteSnapshotRepository implements SnapshotRepository {
  async saveSnapshot(snapshot: Snapshot): Promise<void> {
    const pool = await SovereignDb.getPool();
    
    await pool.push({
      type: 'insert',
      table: 'snapshots' as any,
      values: {
        id: snapshot.id,
        path: snapshot.path,
        content: snapshot.content,
        timestamp: snapshot.timestamp,
        hash: snapshot.hash,
      } as any
    });

    await pool.flush();
  }

  async getLatestSnapshot(filePath: string): Promise<Snapshot | null> {
    const db = await SovereignDb.db();
    
    const result = await db.selectFrom('snapshots' as any)
      .selectAll()
      .where('path', '=', filePath)
      .orderBy('timestamp', 'desc')
      .executeTakeFirst() as any;

    if (!result) return null;

    return {
      id: result.id,
      path: result.path,
      content: result.content,
      timestamp: result.timestamp,
      hash: result.hash,
    };
  }

  async getSnapshotById(id: string): Promise<Snapshot | null> {
    const db = await SovereignDb.db();
    
    const result = await db.selectFrom('snapshots' as any)
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst() as any;

    if (!result) return null;

    return {
      id: result.id,
      path: result.path,
      content: result.content,
      timestamp: result.timestamp,
      hash: result.hash,
    };
  }

  async cleanup(beforeTimestamp: number): Promise<void> {
    const pool = await SovereignDb.getPool();
    
    await pool.push({
      type: 'delete',
      table: 'snapshots' as any,
      where: {
        column: 'timestamp',
        operator: '<',
        value: beforeTimestamp,
      } as any
    });

    await pool.flush();
  }
}
