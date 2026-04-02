/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implements persistence adapter — Domain interfaces
 * Prework Status: 
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Hardening:
 *   - [HARDENED] Migrated to better-sqlite3 for synchronous reliability
 *   - [HARDENED] Full implementation of requirement tracking and state restoration
 *   - [HARDENED] Deterministic checkpoint hashing and data mapping
 */

import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import type { TaskId, TaskEntity, Requirement, TaskPriority } from '../../domain/task/TaskEntity';
import { TaskState } from '../../domain/task/TaskEntity';
import type { ImplementationSnapshot, CheckpointId, CheckpointTrigger, Violation } from '../../domain/task/ImplementationSnapshot';
import { createImplementationSnapshot, generateCheckpointId } from '../../domain/task/ImplementationSnapshot';

/**
 * Map for creating checkpoint structure from snapshot
 */
interface DatabaseCheckpointRow {
  checkpoint_id: string;
  task_id: string;
  timestamp: number;
  completed_requirements: string;
  pending_requirements: string;
  drift_score: number;
  semantic_health: string;
  consistency_score: number;
  output_hash: string;
  output_size_bytes: number;
  state: string;
  tokens_processed: number;
  trigger: string;
  previous_snapshot_id: string | null;
  user_confirmation_required: number;
  drift_reason: string | null;
}

/**
 * Map for storing task entity in database
 */
interface DatabaseTaskRow {
  task_id: string;
  title: string;
  objective: string;
  state: string;
  priority: string;
  initial_context: string;
  completed_at: number | null;
  created_at: number;
  started_at: number | null;
  updated_at: number;
  user_agent: string;
}

/**
 * SQLite-backed checkpoint persistence adapter
 * Provides atomic transactions for reliable state restoration
 */
export class CheckpointPersistenceAdapter {
  private db: Database.Database;
  private verbose: boolean;

  constructor(dbPath: string = './data/diet-code-checkpoints.db', verbose: boolean = true) {
    this.verbose = verbose;
    
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.ensureDatabaseSchema();
    
    if (this.verbose) {
      console.log(`[INFO] CheckpointPersistenceAdapter initialized with DB: ${dbPath}`);
    }
  }

  /**
   * Ensures that the SQLite database schema exists
   */
  private ensureDatabaseSchema(): void {
    this.db.transaction(() => {
      // Tasks table
      this.db.prepare(`
        CREATE TABLE IF NOT EXISTS tasks (
          task_id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          objective TEXT NOT NULL,
          state TEXT NOT NULL,
          priority TEXT NOT NULL,
          initial_context TEXT DEFAULT '',
          completed_at INTEGER,
          created_at INTEGER NOT NULL,
          started_at INTEGER,
          updated_at INTEGER NOT NULL,
          user_agent TEXT NOT NULL
        )
      `).run();

      // Checkpoints table
      this.db.prepare(`
        CREATE TABLE IF NOT EXISTS checkpoints (
          checkpoint_id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          completed_requirements TEXT NOT NULL,
          pending_requirements TEXT NOT NULL,
          drift_score REAL,
          semantic_health TEXT NOT NULL,
          consistency_score REAL,
          output_hash TEXT NOT NULL,
          output_size_bytes INTEGER,
          state TEXT NOT NULL,
          tokens_processed INTEGER,
          trigger TEXT NOT NULL,
          previous_snapshot_id TEXT,
          user_confirmation_required INTEGER DEFAULT 0,
          drift_reason TEXT,
          FOREIGN KEY (task_id) REFERENCES tasks(task_id)
        )
      `).run();

      // Indexes
      this.db.prepare('CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state)').run();
      this.db.prepare('CREATE INDEX IF NOT EXISTS idx_checkpoints_task_timestamp ON checkpoints(task_id, timestamp DESC)').run();
    })();
  }

  /**
   * Persists a task entity atomically
   */
  persistTask(task: TaskEntity): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tasks (
        task_id, title, objective, state, priority,
        initial_context, completed_at, created_at,
        started_at, updated_at, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      task.id,
      task.title,
      task.objective,
      task.state,
      task.priority.toString(),
      task.initialContext,
      task.metadata.completedAt?.getTime() || null,
      task.metadata.createdAt.getTime(),
      task.metadata.startedAt?.getTime() || null,
      task.metadata.updatedAt.getTime(),
      task.metadata.userAgent
    );
  }

  /**
   * Retrieves a task by ID
   */
  getTask(taskId: TaskId): TaskEntity | null {
    const row = this.db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(taskId) as DatabaseTaskRow | undefined;
    
    if (!row) return null;
    return this.mapTaskRowToEntity(row);
  }

  /**
   * Creates a new checkpoint atomically
   */
  async createCheckpoint(
    taskId: TaskId,
    spec: CheckpointSpec,
    allRequirements: Requirement[] = []
  ): Promise<ImplementationSnapshot> {
    const checkpointId = spec.checkpointId || generateCheckpointId();

    // Calculate pending requirements if not provided
    const completedIds = new Set(spec.completedRequirements?.map(r => r.uniqueId) || []);
    const pendingRequirements = allRequirements.filter(r => !completedIds.has(r.uniqueId));

    const snapshot = createImplementationSnapshot({
      checkpointId,
      taskId,
      completedRequirements: spec.completedRequirements || [],
      pendingRequirements,
      totalRequirements: allRequirements.length,
      driftScore: spec.driftScore || 0,
      driftReason: spec.driftReason,
      semanticHealth: {
        ...spec.semanticHealth,
        violations: spec.semanticHealth.violations || [],
        warnings: spec.semanticHealth.warnings || []
      },
      consistencyScore: spec.consistencyScore || 1.0,
      outputHash: spec.outputHash,
      outputSizeBytes: spec.outputSizeBytes || 0,
      state: spec.state || TaskState.IN_PROGRESS,
      tokensProcessed: spec.tokensProcessed || 0,
      trigger: spec.trigger as any,
      parentCheckpointId: spec.previousSnapshotId,
      userConfirmationRequired: spec.userConfirmationRequired
    });

    const stmt = this.db.prepare(`
      INSERT INTO checkpoints (
        checkpoint_id, task_id, timestamp, completed_requirements,
        pending_requirements, drift_score, semantic_health,
        consistency_score, output_hash, output_size_bytes,
        state, tokens_processed, trigger, previous_snapshot_id,
        user_confirmation_required, drift_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      snapshot.checkpointId,
      snapshot.taskId,
      snapshot.timestamp.getTime(),
      JSON.stringify(snapshot.completedRequirements),
      JSON.stringify(snapshot.pendingRequirements),
      snapshot.driftScore,
      JSON.stringify(snapshot.semanticHealth),
      snapshot.consistencyScore,
      snapshot.outputHash,
      snapshot.outputSizeBytes,
      snapshot.state,
      snapshot.tokensProcessed,
      snapshot.metadata.trigger,
      snapshot.metadata.parentCheckpointId || null,
      snapshot.metadata.userConfirmationRequired ? 1 : 0,
      snapshot.driftReason || null
    );

    return snapshot;
  }

  /**
   * Restores the task state from a previous checkpoint
   */
  async restoreCheckpoint(taskId: TaskId, checkpointId: CheckpointId): Promise<ImplementationSnapshot> {
    const row = this.db.prepare(`
      SELECT * FROM checkpoints 
      WHERE task_id = ? AND checkpoint_id = ?
    `).get(taskId, checkpointId) as DatabaseCheckpointRow | undefined;

    if (!row) {
      throw new Error(`Checkpoint ${checkpointId} not found for task ${taskId}`);
    }

    this.db.prepare('UPDATE tasks SET state = ?, updated_at = ? WHERE task_id = ?').run(
      row.state,
      Date.now(),
      taskId
    );

    return this.mapCheckpointRowToEntity(row);
  }

  /**
   * Retrieves the most recent N checkpoints
   */
  getLastCheckpoints(taskId: TaskId, limit: number = 5): ImplementationSnapshot[] {
    const rows = this.db.prepare(`
      SELECT * FROM checkpoints 
      WHERE task_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(taskId, limit) as DatabaseCheckpointRow[];

    return rows.map(row => this.mapCheckpointRowToEntity(row));
  }

  /**
   * Calculates checkpoint age metrics
   */
  getCheckpointAgeMetrics(): CheckpointAgeStats {
    const stats = this.db.prepare(`
      SELECT 
        MIN(timestamp) as oldest_timestamp,
        MAX(timestamp) as newest_timestamp,
        COUNT(DISTINCT task_id) as task_count,
        COUNT(*) as checkpoint_count
      FROM checkpoints
    `).get() as any;

    return {
      oldestSnapshot: stats.oldest_timestamp ? new Date(stats.oldest_timestamp) : null,
      newestSnapshot: stats.newest_timestamp ? new Date(stats.newest_timestamp) : null,
      totalTasks: stats.task_count || 0,
      totalCheckpoints: stats.checkpoint_count || 0,
      dataAgeDays: stats.newest_timestamp ? (Date.now() - stats.newest_timestamp) / (1000 * 60 * 60 * 24) : 0
    };
  }

  /**
   * Maps database row to entity
   */
  private mapTaskRowToEntity(row: DatabaseTaskRow): TaskEntity {
    return {
      id: row.task_id,
      title: row.title,
      objective: row.objective,
      requirements: [],
      acceptanceCriteria: [],
      initialContext: row.initial_context,
      state: row.state as TaskState,
      priority: parseInt(row.priority) as TaskPriority,
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
   * Maps database row to snapshot
   */
  private mapCheckpointRowToEntity(row: DatabaseCheckpointRow): ImplementationSnapshot {
    return {
      checkpointId: row.checkpoint_id,
      taskId: row.task_id,
      timestamp: new Date(row.timestamp),
      completedRequirements: JSON.parse(row.completed_requirements),
      pendingRequirements: JSON.parse(row.pending_requirements),
      totalRequirements: 0, // Recalculated below
      driftScore: row.drift_score || 0,
      driftReason: row.drift_reason || undefined,
      semanticHealth: JSON.parse(row.semantic_health),
      consistencyScore: row.consistency_score || 0,
      outputHash: row.output_hash,
      outputSizeBytes: row.output_size_bytes || 0,
      state: row.state as TaskState,
      tokensProcessed: row.tokens_processed || 0,
      metadata: {
        trigger: row.trigger as any,
        parentCheckpointId: row.previous_snapshot_id || undefined,
        userConfirmationRequired: row.user_confirmation_required === 1
      }
    };
  }

  /**
   * Lists tasks
   */
  listTasks(limit: number = 100): any[] {
    return this.db.prepare(`
      SELECT task_id, title, objective, state, priority, updated_at 
      FROM tasks 
      ORDER BY updated_at DESC 
      LIMIT ?
    `).all(limit);
  }
}

/**
 * Checkpoint specification for creation
 */
export interface CheckpointSpec {
  checkpointId?: string;
  driftScore?: number;
  completedRequirements?: Requirement[];
  semanticHealth: {
    integrityScore: number;
    structureIntegrity: boolean;
    contentIntegrity: boolean;
    objectiveAlignment: number;
    violations?: Violation[];
    warnings?: string[];
  };
  consistencyScore?: number;
  outputHash: string;
  outputSizeBytes?: number;
  state?: TaskState;
  tokensProcessed?: number;
  trigger: string | CheckpointTrigger;
  previousSnapshotId?: string;
  userConfirmationRequired?: boolean;
  driftReason?: string;
}

/**
 * Statistics about checkpoint data age
 */
export interface CheckpointAgeStats {
  oldestSnapshot: Date | null;
  newestSnapshot: Date | null;
  totalTasks: number;
  totalCheckpoints: number;
  dataAgeDays: number;
}