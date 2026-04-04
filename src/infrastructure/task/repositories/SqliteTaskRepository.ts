import type { Database } from 'better-sqlite3';
import type { TaskId, TaskEntity } from '../../../domain/task/TaskEntity';
import type { DatabaseTaskRow } from '../PersistenceSchema';
import { TaskMapper } from '../mappers/TaskMapper';

/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Specialized repository for Task persistence using SQLite.
 * Namespaced with 'hive_' to avoid collision with BroccoliDB system tables.
 */
export class SqliteTaskRepository {
  constructor(private db: Database) {}

  /**
   * Persists a task entity.
   */
  save(task: TaskEntity): void {
    const taskData = TaskMapper.toRowValues(task);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO hive_tasks (
        id, task_id, title, objective, state, priority,
        vitals_heartbeat, v_token, initial_context,
        created_at, updated_at, started_at, completed_at, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(...taskData);
  }

  /**
   * Retrieves a task by ID.
   */
  findById(taskId: TaskId): TaskEntity | null {
    const row = this.db.prepare('SELECT * FROM hive_tasks WHERE id = ?').get(taskId) as DatabaseTaskRow | undefined;
    if (!row) return null;
    return TaskMapper.fromRow(row);
  }

  /**
   * Lists recent tasks.
   */
  list(limit: number = 100): any[] {
    return this.db.prepare(`
      SELECT task_id, title, objective, state, priority, updated_at 
      FROM hive_tasks 
      ORDER BY updated_at DESC 
      LIMIT ?
    `).all(limit);
  }

  /**
   * Updates task state and timestamp.
   */
  updateState(taskId: TaskId, state: string): void {
    this.db.prepare('UPDATE hive_tasks SET state = ?, updated_at = ? WHERE id = ?').run(
      state,
      Date.now(),
      taskId
    );
  }
}
