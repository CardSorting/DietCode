import type { Snapshot, SnapshotRepository } from '../../domain/memory/Snapshot';
import { Core } from './sovereign/Core';

/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Persists file biological state (Snapshots) to BroccoliQ Hive.
 * Massively parallel snapshotting for swarm-wide integrity.
 */
export class SqliteSnapshotRepository implements SnapshotRepository {
  async saveSnapshot(snapshot: Snapshot): Promise<void> {
    await Core.push({
      type: 'insert',
      table: 'snapshots',
      values: {
        id: snapshot.id,
        path: snapshot.path,
        content: snapshot.content,
        timestamp: snapshot.timestamp,
        hash: snapshot.hash,
        mtime: snapshot.mtime,
      },
    });

    await Core.flush();
  }

  async getLatestSnapshot(filePath: string): Promise<Snapshot | null> {
    const results = await Core.selectWhere(
      'snapshots',
      { column: 'path', operator: '=', value: filePath },
      { orderBy: { column: 'timestamp', direction: 'desc' }, limit: 1 },
    );
    const result = results[0] as any;

    if (!result) return null;

    return {
      id: result.id,
      path: result.path,
      content: result.content,
      timestamp: result.timestamp,
      hash: result.hash,
      mtime: result.mtime,
    };
  }

  async getSnapshotById(id: string): Promise<Snapshot | null> {
    const results = await Core.selectWhere(
      'snapshots',
      { column: 'id', operator: '=', value: id },
      { limit: 1 },
    );
    const result = results[0] as any;

    if (!result) return null;

    return {
      id: result.id,
      path: result.path,
      content: result.content,
      timestamp: result.timestamp,
      hash: result.hash,
      mtime: result.mtime,
    };
  }

  async cleanup(beforeTimestamp: number): Promise<void> {
    await Core.push({
      type: 'delete',
      table: 'snapshots',
      where: {
        column: 'timestamp',
        operator: '<',
        value: beforeTimestamp,
      },
    });

    await Core.flush();
  }
}
