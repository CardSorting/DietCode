/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Centralized schema and row definitions for task/checkpoint persistence.
 * Axiomatic Finality: Domain tables are namespaced with 'hive_' and created
 * using raw SQL to ensure unquoted identifier consistency with BroccoliDB.
 */

export interface DatabaseCheckpointRow {
  id: string; // Axiomatic Primary Key
  checkpoint_id: string;
  task_id: string;
  timestamp: number;
  completed_requirements: string; // JSON
  pending_requirements: string; // JSON
  semantic_health: string; // JSON
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
  id: string; // Axiomatic Primary Key
  task_id: string;
  title: string;
  objective: string;
  state: string;
  priority: string;
  initial_context: string;
  vitals_heartbeat: string | null; // JSON
  v_token: string | null;
  completed_at: number | null;
  created_at: number;
  started_at: number | null;
  updated_at: number;
  user_agent: string;
}

export const INITIAL_SCHEMA = `
  -- Tasks table (Namespaced & Unquoted)
  CREATE TABLE IF NOT EXISTS hive_tasks (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    objective TEXT NOT NULL,
    state TEXT NOT NULL,
    priority INTEGER NOT NULL,
    initial_context TEXT DEFAULT '',
    vitals_heartbeat TEXT,
    v_token TEXT,
    completed_at INTEGER,
    created_at INTEGER NOT NULL,
    started_at INTEGER,
    updated_at INTEGER NOT NULL,
    user_agent TEXT NOT NULL
  );

  -- Checkpoints table (Namespaced & Unquoted)
  CREATE TABLE IF NOT EXISTS hive_checkpoints (
    id TEXT PRIMARY KEY,
    checkpoint_id TEXT NOT NULL UNIQUE,
    task_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    completed_requirements TEXT NOT NULL,
    pending_requirements TEXT NOT NULL,
    semantic_health TEXT NOT NULL,
    output_hash TEXT NOT NULL,
    output_size_bytes INTEGER,
    state TEXT NOT NULL,
    tokens_processed INTEGER,
    trigger TEXT NOT NULL,
    previous_snapshot_id TEXT,
    user_confirmation_required INTEGER DEFAULT 0,
    drift_reason TEXT,
    FOREIGN KEY (task_id) REFERENCES hive_tasks(task_id)
  );

  -- Axiomatic Indexes
  CREATE INDEX IF NOT EXISTS idx_hive_tasks_state ON hive_tasks(state);
  CREATE INDEX IF NOT EXISTS idx_hive_checkpoints_task_timestamp ON hive_checkpoints(task_id, timestamp DESC);
`;
