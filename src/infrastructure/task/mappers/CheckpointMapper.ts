import type { ImplementationSnapshot } from '../../../domain/task/ImplementationSnapshot';
import { TaskState } from '../../../domain/task/TaskEntity';
import type { DatabaseCheckpointRow } from '../PersistenceSchema';

/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Pure mapping functions for ImplementationSnapshot <-> DatabaseCheckpointRow.
 */
export class CheckpointMapper {
  /**
   * Converts a database row to an ImplementationSnapshot.
   */
  static fromRow(row: DatabaseCheckpointRow): ImplementationSnapshot {
    return {
      checkpointId: row.checkpoint_id,
      taskId: row.task_id,
      timestamp: new Date(row.timestamp),
      completedRequirements: JSON.parse(row.completed_requirements),
      pendingRequirements: JSON.parse(row.pending_requirements),
      totalRequirements: 0, // Recalculated by the orchestrator if needed
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
   * Converts a snapshot to a value array for SQL INSERT.
   * Order must match: checkpoint_id, task_id, timestamp, completed_requirements,
   * pending_requirements, drift_score, semantic_health, consistency_score,
   * output_hash, output_size_bytes, state, tokens_processed, trigger,
   * previous_snapshot_id, user_confirmation_required, drift_reason
   */
  static toRowValues(snapshot: ImplementationSnapshot): any[] {
    return [
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
    ];
  }
}
