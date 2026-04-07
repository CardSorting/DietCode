/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
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
      table: 'hive_snapshots',
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
      'hive_snapshots',
      { column: 'path', operator: '=', value: filePath },
      undefined,
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
      'hive_snapshots',
      { column: 'id', operator: '=', value: id },
      undefined,
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
      table: 'hive_snapshots',
      where: {
        column: 'timestamp',
        operator: '<',
        value: beforeTimestamp,
      },
    });

    await Core.flush();
  }
}
