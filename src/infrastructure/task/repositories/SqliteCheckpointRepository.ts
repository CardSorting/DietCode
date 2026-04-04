import type { Database } from 'better-sqlite3';
import type { TaskId } from '../../../domain/task/TaskEntity';
import type { CheckpointId, ImplementationSnapshot } from '../../../domain/task/ImplementationSnapshot';
import { CheckpointMapper } from '../mappers/CheckpointMapper';
import type { DatabaseCheckpointRow } from '../PersistenceSchema';
import * as crypto from 'node:crypto';

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
    const id = snapshot.checkpointId || crypto.randomUUID(); // Axiomatic Primary Key
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO hive_checkpoints (
        id, checkpoint_id, task_id, timestamp, completed_requirements,
        pending_requirements, semantic_health,
        output_hash, output_size_bytes,
        state, tokens_processed, trigger, previous_snapshot_id,
        user_confirmation_required, drift_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, ...values);
  }

  /**
   * Retrieves a checkpoint by task ID and checkpoint ID.
   */
  findById(taskId: TaskId, checkpointId: CheckpointId): ImplementationSnapshot | null {
    const row = this.db.prepare(`
      SELECT * FROM hive_checkpoints 
      WHERE task_id = ? AND checkpoint_id = ?
    `).get(taskId, checkpointId) as DatabaseCheckpointRow | undefined;
    if (!row) return null;
    return CheckpointMapper.fromRow(row);
  }

  /**
   * Retrieves recent checkpoints for a task.
   */
  findByTaskId(taskId: TaskId, limit: number = 5): ImplementationSnapshot[] {
    const rows = this.db.prepare(`
      SELECT * FROM hive_checkpoints 
      WHERE task_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(taskId, limit) as DatabaseCheckpointRow[];
    return rows.map(row => CheckpointMapper.fromRow(row));
  }

  /**
   * Gets metrics for checkpoint statistics.
   */
  getMetrics(): any {
    return this.db.prepare(`
      SELECT 
        MIN(timestamp) as oldest_timestamp,
        MAX(timestamp) as newest_timestamp,
        COUNT(DISTINCT task_id) as task_count,
        COUNT(*) as checkpoint_count
      FROM hive_checkpoints
    `).get();
  }
}
