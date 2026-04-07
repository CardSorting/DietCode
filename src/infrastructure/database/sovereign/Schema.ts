/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { CompiledQuery } from 'kysely';

/**
 * [LAYER: INFRASTRUCTURE]
 * [SUB-ZONE: database]
 * Principle: Centralized modern schema management for Sovereign Hive
 *
 * Architecture:
 * - Direct modernization: Removed legacy monkey-patch/nuclear layers
 * - Axiomatic finality: Standardized on 'id' PRIMARY KEY for all tables
 * - Fail-soft initialization: Tables created via IF NOT EXISTS
 */
export class Schema {
  private constructor() {}

  /**
   * Internal helper for self-healing schema drift.
   */
  private static async ensureColumn(db: any, table: string, column: string, definition: string) {
    try {
      const info = await db.executeQuery(CompiledQuery.raw(`PRAGMA table_info(${table})`));
      const exists = info.rows.some((row: any) => row.name === column);
      if (!exists) {
        console.warn(`[CORE] 🛡️ Self-Healing: Missing column detected. Adding '${column}' to '${table}'...`);
        await db.executeQuery(CompiledQuery.raw(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`));
      }
    } catch (e) {
      console.error(`[CORE] ❌ Self-Healing failed for ${table}.${column}:`, e);
    }
  }

  /**
   * Ensure necessary Hive-specific tables exist.
   * Standard BroccoliDB tables are managed internally by the dbPool.
   */
  static async ensureSchema(dbPool: any) {
    const startTime = Date.now();
    console.log('[CORE] 🚀 Synchronizing Sovereign Hive schema (Modern Architecture)...');

    // Get all active shards to ensure comprehensive hardening
    const shards = dbPool.getActiveShards ? dbPool.getActiveShards() : ['main'];

    for (const shardId of shards) {
      const db = await dbPool.getDb(shardId);

      const execute = async (rawSql: string) => {
        try {
          await db.executeQuery(CompiledQuery.raw(rawSql));
        } catch (e) {
          console.error(`[CORE] Error initializing hive table on shard ${shardId}:`, e);
        }
      };

      // HIVE CORE TABLES (Axiomatic Namespacing)
      await execute(
        'CREATE TABLE IF NOT EXISTS hive_kb (id TEXT PRIMARY KEY, knowledge_key TEXT NOT NULL, knowledge_value TEXT NOT NULL, type TEXT NOT NULL, confidence REAL NOT NULL, tags TEXT NOT NULL, metadata TEXT, created_at TEXT NOT NULL)',
      );
      await execute(
        'CREATE TABLE IF NOT EXISTS hive_healing_proposals (id TEXT PRIMARY KEY, violation_id TEXT NOT NULL, violation TEXT NOT NULL, rationale TEXT NOT NULL, proposed_code TEXT NOT NULL, status TEXT NOT NULL, confidence REAL DEFAULT 1.0, created_at TEXT NOT NULL, applied_at TEXT)',
      );
      await execute(
        'CREATE TABLE IF NOT EXISTS hive_snapshots (id TEXT PRIMARY KEY, path TEXT NOT NULL, content TEXT NOT NULL, timestamp INTEGER NOT NULL, hash TEXT NOT NULL, mtime INTEGER)',
      );
      await execute(
        'CREATE TABLE IF NOT EXISTS hive_file_context (id TEXT PRIMARY KEY, path TEXT NOT NULL, state TEXT NOT NULL, source TEXT NOT NULL, last_read_date INTEGER, last_edit_date INTEGER, signature TEXT, external_edit_detected INTEGER DEFAULT 0)',
      );
      await execute(
        'CREATE TABLE IF NOT EXISTS hive_audit (id TEXT PRIMARY KEY, session_id TEXT, type TEXT NOT NULL, message TEXT NOT NULL, data TEXT, timestamp INTEGER NOT NULL)',
      );
      await execute(
        'CREATE TABLE IF NOT EXISTS hive_agent_sessions (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, status TEXT NOT NULL, start_time INTEGER NOT NULL, end_time INTEGER)',
      );

      // HIVE ANALYTICS & METRICS
      await execute(
        'CREATE TABLE IF NOT EXISTS hive_joy_imports (id TEXT PRIMARY KEY, source_path TEXT NOT NULL, imported_path TEXT NOT NULL)',
      );
      await execute(
        'CREATE TABLE IF NOT EXISTS hive_joy_history (id TEXT PRIMARY KEY, violation_count INTEGER NOT NULL, file_count INTEGER NOT NULL, timestamp INTEGER NOT NULL)',
      );
      await execute(
        'CREATE TABLE IF NOT EXISTS hive_metabolic_telemetry (id TEXT PRIMARY KEY, task_id TEXT, reads INTEGER NOT NULL, writes INTEGER NOT NULL, lines_added INTEGER NOT NULL, lines_deleted INTEGER NOT NULL, tokens_processed INTEGER NOT NULL, verifications_success INTEGER NOT NULL, timestamp INTEGER NOT NULL)',
      );
      await execute(
        'CREATE TABLE IF NOT EXISTS hive_tasks (id TEXT PRIMARY KEY, task_id TEXT NOT NULL UNIQUE, title TEXT NOT NULL, objective TEXT NOT NULL, state TEXT NOT NULL, priority INTEGER NOT NULL, vitals_heartbeat TEXT, v_token TEXT, initial_context TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, started_at INTEGER, completed_at INTEGER, user_agent TEXT NOT NULL)',
      );
      await execute(
        'CREATE TABLE IF NOT EXISTS hive_llm_telemetry (id TEXT PRIMARY KEY, repo_path TEXT NOT NULL, agent_id TEXT NOT NULL, task_id TEXT, prompt_tokens INTEGER, completion_tokens INTEGER, total_tokens INTEGER, model_id TEXT, cost REAL, timestamp INTEGER NOT NULL, environment TEXT)',
      );
      await execute(
        'CREATE TABLE IF NOT EXISTS hive_joy_metrics (id TEXT PRIMARY KEY, path TEXT NOT NULL, violation_count INTEGER NOT NULL, hash TEXT NOT NULL, last_scanned INTEGER NOT NULL)',
      );
      await execute(
        'CREATE TABLE IF NOT EXISTS hive_joy_bypasses (id TEXT PRIMARY KEY, path TEXT NOT NULL, violation_type TEXT NOT NULL, timestamp INTEGER NOT NULL)',
      );
      await execute(
        'CREATE TABLE IF NOT EXISTS hive_locks (id TEXT PRIMARY KEY, resource TEXT NOT NULL, owner_id TEXT NOT NULL, lock_code TEXT NOT NULL, expires_at INTEGER NOT NULL, acquired_at INTEGER NOT NULL)',
      );

      // HIVE ORCHESTRATION
      await execute(
        'CREATE TABLE IF NOT EXISTS hive_queue (id TEXT PRIMARY KEY, type TEXT NOT NULL, status TEXT NOT NULL, total_shards INTEGER NOT NULL, completed_shards INTEGER DEFAULT 0, metadata TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)',
      );
      await execute(
        'CREATE TABLE IF NOT EXISTS hive_job_results (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, shard_id INTEGER NOT NULL, status TEXT NOT NULL, payload TEXT, error TEXT, priority INTEGER DEFAULT 0, timestamp INTEGER NOT NULL)',
      );

      // Level 2: Self-Healing Column Injection (Legacy Support)
      // Note: We use TEXT instead of TEXT PRIMARY KEY here because SQLite 
      // does not support adding PRIMARY KEY columns via ALTER TABLE.
      await Schema.ensureColumn(db, 'hive_kb', 'id', 'TEXT');
      await Schema.ensureColumn(db, 'hive_healing_proposals', 'id', 'TEXT');
      await Schema.ensureColumn(db, 'hive_snapshots', 'id', 'TEXT');
      await Schema.ensureColumn(db, 'hive_file_context', 'id', 'TEXT');
      await Schema.ensureColumn(db, 'hive_audit', 'id', 'TEXT');
      await Schema.ensureColumn(db, 'hive_agent_sessions', 'id', 'TEXT');
      await Schema.ensureColumn(db, 'hive_joy_imports', 'id', 'TEXT');
      await Schema.ensureColumn(db, 'hive_joy_history', 'id', 'TEXT');
      await Schema.ensureColumn(db, 'hive_metabolic_telemetry', 'id', 'TEXT');
      await Schema.ensureColumn(db, 'hive_tasks', 'id', 'TEXT');
      await Schema.ensureColumn(db, 'hive_llm_telemetry', 'id', 'TEXT');
      await Schema.ensureColumn(db, 'hive_joy_metrics', 'id', 'TEXT');
      await Schema.ensureColumn(db, 'hive_joy_bypasses', 'id', 'TEXT');
      await Schema.ensureColumn(db, 'hive_locks', 'id', 'TEXT');
      await Schema.ensureColumn(db, 'hive_queue', 'id', 'TEXT');
      await Schema.ensureColumn(db, 'hive_job_results', 'id', 'TEXT');

      // INDICES
      await execute(
        'CREATE INDEX IF NOT EXISTS idx_hive_telemetry_task ON hive_llm_telemetry (task_id)',
      );
      await execute(
        'CREATE INDEX IF NOT EXISTS idx_hive_metabolic_task ON hive_metabolic_telemetry (task_id)',
      );
      await execute('CREATE INDEX IF NOT EXISTS idx_hive_kb_key ON hive_kb (knowledge_key)');
    }

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[CORE] 🏁 Sovereign Hive synchronization complete in ${totalElapsed}s (Zero-Shim Modern)`);
  }
}
