/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Centralized schema and row definitions for task/checkpoint persistence.
 */

export interface DatabaseCheckpointRow {
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

export interface DatabaseTaskRow {
  task_id: string;
  title: string;
  objective: string;
  state: string;
  priority: string;
  initial_context: string;
  sim_integrity: string | null; // JSON for AxiomProfile
  vitals_heartbeat: string | null; // JSON
  v_token: string | null;
  completed_at: number | null;
  created_at: number;
  started_at: number | null;
  updated_at: number;
  user_agent: string;
}

export const INITIAL_SCHEMA = `
  -- Tasks table
  CREATE TABLE IF NOT EXISTS tasks (
    task_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    objective TEXT NOT NULL,
    state TEXT NOT NULL,
    priority TEXT NOT NULL,
    initial_context TEXT DEFAULT '',
    sim_integrity TEXT,
    vitals_heartbeat TEXT,
    v_token TEXT,
    completed_at INTEGER,
    created_at INTEGER NOT NULL,
    started_at INTEGER,
    updated_at INTEGER NOT NULL,
    user_agent TEXT NOT NULL
  );

  -- Checkpoints table
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
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state);
  CREATE INDEX IF NOT EXISTS idx_checkpoints_task_timestamp ON checkpoints(task_id, timestamp DESC);
`;
