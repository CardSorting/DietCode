/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implements persistence adapter — Domain interfaces
 * Hardening:
 *   - [HARDENED] Migrated to better-sqlite3 for synchronous reliability
 *   - [HARDENED] Separation of concerns (Mappers, Repositories, Schema)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import type {
  AxiomProfile,
  CheckpointId,
  CheckpointTrigger,
  ImplementationSnapshot,
  Violation,
} from '../../domain/task/ImplementationSnapshot';
import {
  ComplianceState,
  IntegrityAxiom,
  createImplementationSnapshot,
  generateCheckpointId,
} from '../../domain/task/ImplementationSnapshot';
import type { IPersistenceAdapter } from '../../domain/task/SovereignAdapters';
import type { Requirement, TaskEntity, TaskId } from '../../domain/task/TaskEntity';
import { TaskState } from '../../domain/task/TaskEntity';

import { INITIAL_SCHEMA } from './PersistenceSchema';
import { SqliteCheckpointRepository } from './repositories/SqliteCheckpointRepository';
import { SqliteTaskRepository } from './repositories/SqliteTaskRepository';

/**
 * SQLite-backed checkpoint persistence adapter
 * Coordinates between Task and Checkpoint repositories for reliable state restoration.
 */
export class CheckpointPersistenceAdapter implements IPersistenceAdapter {
  private db: Database.Database;
  private taskRepo: SqliteTaskRepository;
  private checkpointRepo: SqliteCheckpointRepository;
  private verbose: boolean;

  constructor(dbPath = './data/diet-code-checkpoints.db', verbose = true) {
    this.verbose = verbose;

    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.ensureDatabaseSchema();

    this.taskRepo = new SqliteTaskRepository(this.db);
    this.checkpointRepo = new SqliteCheckpointRepository(this.db);

    if (this.verbose) {
      console.log(`[INFO] CheckpointPersistenceAdapter initialized with DB: ${dbPath}`);
    }
  }

  /**
   * Ensures that the SQLite database schema exists
   */
  private ensureDatabaseSchema(): void {
    this.db.exec(INITIAL_SCHEMA);
  }

  /**
   * Persists a task entity atomically
   */
  persistTask(task: TaskEntity): void {
    this.taskRepo.save(task);
  }

  /**
   * Retrieves a task by ID
   */
  getTask(taskId: TaskId): TaskEntity | null {
    return this.taskRepo.findById(taskId);
  }

  /**
   * Creates a new checkpoint atomically
   */
  async createCheckpoint(
    taskId: TaskId,
    spec: CheckpointSpec,
    allRequirements: Requirement[] = [],
  ): Promise<ImplementationSnapshot> {
    const checkpointId = spec.checkpointId || generateCheckpointId();

    // Calculate pending requirements if not provided
    const completedIds = new Set(spec.completedRequirements?.map((r) => r.uniqueId) || []);
    const pendingRequirements = allRequirements.filter((r) => !completedIds.has(r.uniqueId));

    const snapshot = createImplementationSnapshot({
      checkpointId,
      taskId,
      completedRequirements: spec.completedRequirements || [],
      pendingRequirements,
      totalRequirements: allRequirements.length,
      semanticHealth: {
        axiomProfile: spec.axiomProfile || {
          status: ComplianceState.CLEARED,
          failingAxioms: [],
          axiomResults: {
            [IntegrityAxiom.STRUCTURAL]: true,
            [IntegrityAxiom.RESONANCE]: true,
            [IntegrityAxiom.PURITY]: true,
            [IntegrityAxiom.STABILITY]: true,
            [IntegrityAxiom.INTERFACE_INTEGRITY]: true,
            [IntegrityAxiom.COGNITIVE_SIMPLICITY]: true,
          },
        },
        violations: spec.semanticHealth?.violations || [],
        warnings: spec.semanticHealth?.warnings || [],
      },
      outputHash: spec.outputHash,
      outputSizeBytes: spec.outputSizeBytes || 0,
      state: spec.state || TaskState.SOVEREIGN_DOING,
      tokensProcessed: spec.tokensProcessed || 0,
      trigger: spec.trigger as any,
      parentCheckpointId: spec.previousSnapshotId,
      userConfirmationRequired: spec.userConfirmationRequired,
    });

    this.checkpointRepo.save(snapshot);
    return snapshot;
  }

  /**
   * Restores the task state from a previous checkpoint
   */
  async restoreCheckpoint(
    taskId: TaskId,
    checkpointId: CheckpointId,
  ): Promise<ImplementationSnapshot> {
    const snapshot = this.checkpointRepo.findById(taskId, checkpointId);
    if (!snapshot) {
      throw new Error(`Checkpoint ${checkpointId} not found for task ${taskId}`);
    }

    this.taskRepo.updateState(taskId, snapshot.state);
    return snapshot;
  }

  /**
   * Retrieves the most recent N checkpoints
   */
  getLastCheckpoints(taskId: TaskId, limit = 5): ImplementationSnapshot[] {
    return this.checkpointRepo.findByTaskId(taskId, limit);
  }

  /**
   * Calculates checkpoint age metrics
   */
  getCheckpointAgeMetrics(): CheckpointAgeStats {
    const stats = this.checkpointRepo.getMetrics();

    return {
      oldestSnapshot: stats.oldest_timestamp ? new Date(stats.oldest_timestamp) : null,
      newestSnapshot: stats.newest_timestamp ? new Date(stats.newest_timestamp) : null,
      totalTasks: stats.task_count || 0,
      totalCheckpoints: stats.checkpoint_count || 0,
      dataAgeDays: stats.newest_timestamp
        ? (Date.now() - stats.newest_timestamp) / (1000 * 60 * 60 * 24)
        : 0,
    };
  }

  /**
   * Lists tasks
   */
  listTasks(limit = 100): any[] {
    return this.taskRepo.list(limit);
  }
}

/**
 * Checkpoint specification for creation
 */
export interface CheckpointSpec {
  checkpointId?: string;
  completedRequirements?: Requirement[];
  semanticHealth: {
    structureIntegrity: boolean;
    contentIntegrity: boolean;
    violations?: Violation[];
    warnings?: string[];
  };
  outputHash: string;
  outputSizeBytes?: number;
  state?: TaskState;
  tokensProcessed?: number;
  trigger: string | CheckpointTrigger;
  axiomProfile?: AxiomProfile;
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
