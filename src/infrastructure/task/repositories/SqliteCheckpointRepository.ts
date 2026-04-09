/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as crypto from 'node:crypto';
import type { Database } from 'better-sqlite3';
import type {
  CheckpointId,
  ImplementationSnapshot,
} from '../../../domain/task/ImplementationSnapshot';
import type { TaskId } from '../../../domain/task/TaskEntity';
import type { DatabaseCheckpointRow } from '../PersistenceSchema';
import { CheckpointMapper } from '../mappers/CheckpointMapper';

/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Specialized repository for Checkpoint persistence using SQLite.
 * Namespaced with 'hive_' to avoid collision with BroccoliDB system tables.
 */
export class SqliteCheckpointRepository {
  constructor(private db: Database) {}

  /**
   * Persists a checkpoint.
   */
  save(snapshot: ImplementationSnapshot): void {
    const values = CheckpointMapper.toRowValues(snapshot);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO hive_checkpoints (
        id, checkpoint_id, task_id, timestamp, completed_requirements,
        pending_requirements, semantic_health,
        output_hash, output_size_bytes,
        state, tokens_processed, trigger, previous_snapshot_id,
        user_confirmation_required, drift_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(...values);
  }

  /**
   * Retrieves a checkpoint by task ID and checkpoint ID.
   */
  findById(taskId: TaskId, checkpointId: CheckpointId): ImplementationSnapshot | null {
    const row = this.db
      .prepare(`
      SELECT * FROM hive_checkpoints 
      WHERE id = ?
    `)
      .get(checkpointId) as DatabaseCheckpointRow | undefined;
    if (!row) return null;
    return CheckpointMapper.fromRow(row);
  }

  /**
   * Retrieves recent checkpoints for a task.
   */
  findByTaskId(taskId: TaskId, limit = 5): ImplementationSnapshot[] {
    const rows = this.db
      .prepare(`
      SELECT * FROM hive_checkpoints 
      WHERE task_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `)
      .all(taskId, limit) as DatabaseCheckpointRow[];
    return rows.map((row) => CheckpointMapper.fromRow(row));
  }

  /**
   * Gets metrics for checkpoint statistics.
   */
  getMetrics(): any {
    return this.db
      .prepare(`
      SELECT 
        MIN(timestamp) as oldest_timestamp,
        MAX(timestamp) as newest_timestamp,
        COUNT(DISTINCT task_id) as task_count,
        COUNT(*) as checkpoint_count
      FROM hive_checkpoints
    `)
      .get();
  }
}
