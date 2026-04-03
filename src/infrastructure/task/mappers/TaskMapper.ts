import type { TaskEntity, TaskPriority } from '../../../domain/task/TaskEntity';
import { TaskState } from '../../../domain/task/TaskEntity';
import type { DatabaseTaskRow } from '../PersistenceSchema';

/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Pure mapping functions for TaskEntity <-> DatabaseTaskRow.
 */
export class TaskMapper {
  /**
   * Converts a database row to a TaskEntity.
   */
  static fromRow(row: DatabaseTaskRow): TaskEntity {
    return {
      id: row.task_id,
      title: row.title,
      objective: row.objective,
      requirements: [], // Loaded separately or not stored in core tasks table
      acceptanceCriteria: [],
      initialContext: row.initial_context,
      state: row.state as TaskState,
      priority: parseInt(row.priority) as TaskPriority,
      simAxiomProfile: row.sim_integrity ? JSON.parse(row.sim_integrity) : undefined,
      vitalsHeartbeat: row.vitals_heartbeat ? JSON.parse(row.vitals_heartbeat) : undefined,
      vToken: row.v_token ?? undefined,
      constraintViolations: [],
      metadata: {
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        startedAt: row.started_at ? new Date(row.started_at) : undefined,
        completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
        userAgent: row.user_agent
      }
    };
  }

  /**
   * Converts a TaskEntity to a value array for SQL INSERT/REPLACE.
   * Order must match: task_id, title, objective, state, priority, initial_context,
   * sim_integrity, vitals_heartbeat, v_token, completed_at, created_at, started_at,
   * updated_at, user_agent
   */
  static toRowValues(task: TaskEntity): any[] {
    return [
      task.id,
      task.title,
      task.objective,
      task.state,
      task.priority.toString(),
      task.initialContext,
      task.simAxiomProfile ? JSON.stringify(task.simAxiomProfile) : null,
      task.vitalsHeartbeat ? JSON.stringify(task.vitalsHeartbeat) : null,
      task.vToken || null,
      task.metadata.completedAt?.getTime() || null,
      task.metadata.createdAt.getTime(),
      task.metadata.startedAt?.getTime() || null,
      task.metadata.updatedAt.getTime(),
      task.metadata.userAgent
    ];
  }
}
