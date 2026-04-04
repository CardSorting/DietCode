import type { TaskEntity, TaskPriority } from '../../../domain/task/TaskEntity';
import type { TaskState } from '../../../domain/task/TaskEntity';
import type { DatabaseTaskRow } from '../PersistenceSchema';

/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Pure mapping functions for TaskEntity <-> DatabaseTaskRow.
 */
export class TaskMapper {
  private constructor() {}
  /**
   * Converts a database row to a TaskEntity.
   */
  static fromRow(row: DatabaseTaskRow): TaskEntity {
    return {
      id: row.id,
      title: row.title,
      objective: row.objective,
      requirements: [], // Loaded separately or not stored in core tasks table
      acceptanceCriteria: [],
      initialContext: row.initial_context,
      state: row.state as TaskState,
      priority: Number.parseInt(row.priority) as TaskPriority,
      vitalsHeartbeat: row.vitals_heartbeat ? JSON.parse(row.vitals_heartbeat) : undefined,
      vToken: row.v_token ?? undefined,
      constraintViolations: [],
      metadata: {
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        startedAt: row.started_at ? new Date(row.started_at) : undefined,
        completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
        userAgent: row.user_agent,
      },
    };
  }

  /**
   * Converts a TaskEntity to a value array for SQL INSERT/REPLACE.
   * Order must match: id, task_id, title, objective, state, priority,
   *   vitals_heartbeat, v_token, initial_context, created_at, updated_at,
   *   started_at, completed_at, user_agent
   */
  static toRowValues(task: TaskEntity): any[] {
    return [
      task.id, // Primary Key 'id'
      task.id, // 'task_id' field
      task.title,
      task.objective,
      task.state,
      task.priority.toString(),
      task.vitalsHeartbeat ? JSON.stringify(task.vitalsHeartbeat) : null,
      task.vToken || null,
      task.initialContext,
      task.metadata.createdAt.getTime(),
      task.metadata.updatedAt.getTime(),
      task.metadata.startedAt?.getTime() || null,
      task.metadata.completedAt?.getTime() || null,
      task.metadata.userAgent,
    ];
  }
}
