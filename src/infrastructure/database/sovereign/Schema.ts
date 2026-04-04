import { sql, CompiledQuery } from 'kysely';

export class Schema {
  /**
   * Internal schema management — handles idempotent table and index creation.
   * Axiomatic Finality: Domain tables are namespaced with 'hive_' and created
   * using raw SQL to ensure unquoted identifier consistency with BroccoliDB.
   * Nuclear System Hardening (Phase 8): Surgical patching of BroccoliDB's 
   * internal system tables to ensure 'id' primary key existence.
   */
  
  /**
   * Nuclear System Hardening: Surgical patching for tables missing 'id' column.
   * This method detects tables without an 'id TEXT PRIMARY KEY' column and 
   * performs a safe data migration to add the missing primary key.
   */
  private static async surgicalPatchTable(db: any, tableName: string) {
    try {
      // Check table structure via PRAGMA table_info to detect missing 'id'
      const result = await db.executeQuery(
        CompiledQuery.raw(`PRAGMA table_info(${tableName})`)
      );
      
      // Handle different result formats from broccoliq/Kysely
      let tableInfo;
      if (Array.isArray(result)) {
        tableInfo = result;
      } else if (result && typeof result === 'object') {
        // broccoliq returns { rows: [...] }
        if ('rows' in result && Array.isArray(result.rows)) {
          tableInfo = result.rows;
        } else if ('result' in result && Array.isArray(result.result)) {
          tableInfo = result.result;
        } else if ('columns' in result && Array.isArray(result.columns)) {
          tableInfo = result.columns;
        } else if ('data' in result && Array.isArray(result.data)) {
          tableInfo = result.data;
        } else {
          tableInfo = Object.values(result);
        }
      } else {
        throw new Error(`Cannot handle result type: ${typeof result}`);
      }
      
      if (!tableInfo || !Array.isArray(tableInfo)) {
        throw new Error(`Invalid table info format for table '${tableName}'`);
      }
      
      const columnNames = new Set(
        tableInfo.map((col: any) => col.name)
      );
      
      // Exit early if 'id' exists
      if (columnNames.has('id')) {
        return; // Table already has id, no patching needed
      }
      
      console.log(`[NUCLEAR PATCH] Preparing to patch table '${tableName}' (missing 'id' column)`);
      
      // Start transaction for atomicity
      await db.executeQuery(CompiledQuery.raw('BEGIN TRANSACTION'));
      
      // Create temp table with proper schema including 'id'
      // We mirror the current schema but add 'id TEXT PRIMARY KEY'
      let tempSchema = '';
      
      if (tableName === 'queue_settings' || tableName === 'settings') {
        tempSchema = `id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, value TEXT, updatedAt INTEGER`;
      } else if (tableName === 'knowledge_edges') {
        tempSchema = `id TEXT PRIMARY KEY, sourceId TEXT NOT NULL, targetId TEXT NOT NULL, type TEXT NOT NULL, weight REAL DEFAULT 1.0`;
      } else if (tableName === 'branches') {
        tempSchema = `id TEXT PRIMARY KEY, repoPath TEXT NOT NULL, name TEXT NOT NULL, head TEXT, isEphemeral INTEGER, createdAt INTEGER, expiresAt INTEGER`;
      } else if (tableName === 'claims') {
        tempSchema = `id TEXT PRIMARY KEY, repoPath TEXT NOT NULL, branch TEXT NOT NULL, path TEXT NOT NULL, author TEXT NOT NULL, timestamp INTEGER NOT NULL, expiresAt INTEGER`;
      } else if (tableName === 'tags') {
        tempSchema = `id TEXT PRIMARY KEY, repoPath TEXT NOT NULL, name TEXT NOT NULL, head TEXT, createdAt INTEGER`;
      } else {
        // Generic schema for unknown tables: give every row a UUID
        tempSchema = `id TEXT PRIMARY KEY`;
        // Auto-increment for existing rowid based IDs
        await db.executeQuery(
          CompiledQuery.raw(`INSERT INTO ${tableName}_temp (${tempSchema}) SELECT rowid::text FROM ${tableName}`)
        );
      }
      
      // Create temp table with schema including 'id'
      const tempTableName = `${tableName}_temp`;
      await db.executeQuery(
        CompiledQuery.raw(`DROP TABLE IF EXISTS ${tempTableName}`)
      );
      await db.executeQuery(
        CompiledQuery.raw(`CREATE TABLE ${tempTableName} (${tempSchema})`)
      );
      
      // Migrate all existing data to temp table
      // We need to explicitly select columns because SELECT * includes implicit ROWID
      // which conflicts with our generated 'id' column
      let selectColumns = '';
      
      if (tableName === 'queue_settings' || tableName === 'settings') {
        selectColumns = 'key, value, updatedAt';
      } else if (tableName === 'knowledge_edges') {
        selectColumns = 'sourceId, targetId, type, weight';
      } else if (tableName === 'branches') {
        selectColumns = 'repoPath, name, head, isEphemeral, createdAt, expiresAt';
      } else if (tableName === 'claims') {
        selectColumns = 'repoPath, branch, path, author, timestamp, expiresAt';
      } else if (tableName === 'tags') {
        selectColumns = 'repoPath, name, head, createdAt';
      } else {
        // Generic fallback: SELECT * with explicit id
        selectColumns = '*';
      }
      
      await db.executeQuery(
        CompiledQuery.raw(`INSERT INTO ${tempTableName} (id, ${selectColumns}) SELECT '${crypto.randomUUID()}', ${selectColumns} FROM ${tableName}`)
      );
      
      // Verify data migration integrity
      const rowCountResult = await db.executeQuery(
        CompiledQuery.raw(`SELECT COUNT(*) as count FROM ${tableName}`)
      );
      const rowCount = Array.isArray(rowCountResult) ? rowCountResult : (rowCountResult?.rows || rowCountResult?.result || rowCountResult);
      const migrationCount = (rowCount as any)?.[0]?.count || 0;
      
      if (migrationCount > 0) {
        const tempRowCountResult = await db.executeQuery(
          CompiledQuery.raw(`SELECT COUNT(*) as count FROM ${tempTableName}`)
        );
        const tempRowCount = Array.isArray(tempRowCountResult) ? tempRowCountResult : (tempRowCountResult?.rows || tempRowCountResult?.result || tempRowCountResult);
        if ((tempRowCount as any)?.[0]?.count !== migrationCount) {
          throw new Error(`Data loss detected during migration: ${migrationCount} rows in original table but ${(tempRowCount as any)?.[0]?.count} in temp table`);
        }
      }
      
      // Drop original table and rename temp table to original
      await db.executeQuery(
        CompiledQuery.raw(`DROP TABLE ${tableName}`)
      );
      await db.executeQuery(
        CompiledQuery.raw(`ALTER TABLE ${tempTableName} RENAME TO ${tableName}`)
      );
      
      // Verify patch by checking table structure
      const verifyTableInfoResult = await db.executeQuery(
        CompiledQuery.raw(`PRAGMA table_info(${tableName})`)
      );
      const tableInfoRows = Array.isArray(verifyTableInfoResult) ? verifyTableInfoResult : (verifyTableInfoResult?.rows || verifyTableInfoResult?.result || verifyTableInfoResult);
      const newColumnNames = new Set(
        tableInfoRows.map((col: any) => col.name)
      );
      
      if (!newColumnNames.has('id')) {
        throw new Error(`Patching failed: 'id' column still missing from table '${tableName}' after migration`);
      }
      
      console.log(`[NUCLEAR PATCH] ✅ Successfully patched table '${tableName}' with 'id' column`);
      
      // Commit transaction
      await db.executeQuery(CompiledQuery.raw('COMMIT'));
      
    } catch (error: any) {
      // Rollback on any error to preserve data integrity
      try {
        await db.executeQuery(CompiledQuery.raw('ROLLBACK'));
      } catch (e) {}
      console.error(`[NUCLEAR PATCH] ❌ Failed to patch table '${tableName}':`, error.message);
      throw error;
    }
  }

  static async ensureSchema(db: any) {
    const execute = async (rawSql: string) => {
        try { await db.executeQuery(CompiledQuery.raw(rawSql)); } catch (e) {}
    };

    // 0. Nuclear System Hardening: Fix BroccoliDB's own internal tables
    // We attempt to add 'id' TEXT PRIMARY KEY to known tables that miss it.
    // Since SQLite doesn't support 'ADD COLUMN PRIMARY KEY', we must ensure they are created correctly
    // or patched if empty.
    
    // Internal tables we know are missing 'id' from audit
    const systemTables = ['branches', 'claims', 'knowledge_edges', 'queue_settings', 'settings', 'tags'];
    
    for (const table of systemTables) {
        // 0a. Create table with proper schema if not exists
        if (table === 'queue_settings' || table === 'settings') {
            await execute(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, value TEXT, updatedAt INTEGER)`);
        } else if (table === 'knowledge_edges') {
            await execute(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, sourceId TEXT NOT NULL, targetId TEXT NOT NULL, type TEXT NOT NULL, weight REAL DEFAULT 1.0)`);
        } else if (table === 'branches') {
            await execute(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, repoPath TEXT NOT NULL, name TEXT NOT NULL, head TEXT, isEphemeral INTEGER, createdAt INTEGER, expiresAt INTEGER)`);
        } else if (table === 'claims') {
            await execute(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, repoPath TEXT NOT NULL, branch TEXT NOT NULL, path TEXT NOT NULL, author TEXT NOT NULL, timestamp INTEGER NOT NULL, expiresAt INTEGER)`);
        } else if (table === 'tags') {
            await execute(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, repoPath TEXT NOT NULL, name TEXT NOT NULL, head TEXT, createdAt INTEGER)`);
        }
        
        // 0b. Surgical patch: Verify and add 'id' column if missing
        await this.surgicalPatchTable(db, table);
    }

    // 1. Core Logic Tables (Namespaced)
    await execute(`CREATE TABLE IF NOT EXISTS hive_kb (id TEXT PRIMARY KEY, knowledge_key TEXT NOT NULL, knowledge_value TEXT NOT NULL, type TEXT NOT NULL, confidence REAL NOT NULL, tags TEXT NOT NULL, metadata TEXT, created_at TEXT NOT NULL)`);
    await execute(`CREATE TABLE IF NOT EXISTS hive_healing_proposals (id TEXT PRIMARY KEY, violation_id TEXT NOT NULL, violation TEXT NOT NULL, rationale TEXT NOT NULL, proposed_code TEXT NOT NULL, status TEXT NOT NULL, confidence REAL DEFAULT 1.0, created_at TEXT NOT NULL, applied_at TEXT)`);
    await execute(`CREATE TABLE IF NOT EXISTS hive_snapshots (id TEXT PRIMARY KEY, path TEXT NOT NULL, content TEXT NOT NULL, timestamp INTEGER NOT NULL, hash TEXT NOT NULL, mtime INTEGER)`);
    await execute(`CREATE TABLE IF NOT EXISTS hive_file_context (id TEXT PRIMARY KEY, path TEXT NOT NULL, state TEXT NOT NULL, source TEXT NOT NULL, last_read_date INTEGER, last_edit_date INTEGER, signature TEXT, external_edit_detected INTEGER DEFAULT 0)`);
    await execute(`CREATE TABLE IF NOT EXISTS hive_audit (id TEXT PRIMARY KEY, session_id TEXT, type TEXT NOT NULL, message TEXT NOT NULL, data TEXT, timestamp INTEGER NOT NULL)`);
    await execute(`CREATE TABLE IF NOT EXISTS hive_agent_sessions (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, status TEXT NOT NULL, start_time INTEGER NOT NULL, end_time INTEGER)`);

    // 2. Joy / Structural Analysis
    await execute(`CREATE TABLE IF NOT EXISTS hive_joy_imports (id TEXT PRIMARY KEY, source_path TEXT NOT NULL, imported_path TEXT NOT NULL)`);
    await execute(`CREATE TABLE IF NOT EXISTS hive_joy_history (id TEXT PRIMARY KEY, violation_count INTEGER NOT NULL, file_count INTEGER NOT NULL, timestamp INTEGER NOT NULL)`);
    await execute(`CREATE TABLE IF NOT EXISTS hive_metabolic_telemetry (id TEXT PRIMARY KEY, task_id TEXT, reads INTEGER NOT NULL, writes INTEGER NOT NULL, lines_added INTEGER NOT NULL, lines_deleted INTEGER NOT NULL, tokens_processed INTEGER NOT NULL, verifications_success INTEGER NOT NULL, timestamp INTEGER NOT NULL)`);
    await execute(`CREATE TABLE IF NOT EXISTS hive_tasks (id TEXT PRIMARY KEY, task_id TEXT NOT NULL UNIQUE, title TEXT NOT NULL, objective TEXT NOT NULL, state TEXT NOT NULL, priority INTEGER NOT NULL, vitals_heartbeat TEXT, v_token TEXT, initial_context TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, started_at INTEGER, completed_at INTEGER, user_agent TEXT NOT NULL)`);
    await execute(`CREATE TABLE IF NOT EXISTS hive_llm_telemetry (id TEXT PRIMARY KEY, repo_path TEXT NOT NULL, agent_id TEXT NOT NULL, task_id TEXT, prompt_tokens INTEGER, completion_tokens INTEGER, total_tokens INTEGER, model_id TEXT, cost REAL, timestamp INTEGER NOT NULL, environment TEXT)`);
    await execute(`CREATE TABLE IF NOT EXISTS hive_joy_metrics (id TEXT PRIMARY KEY, path TEXT NOT NULL, violation_count INTEGER NOT NULL, hash TEXT NOT NULL, last_scanned INTEGER NOT NULL)`);
    await execute(`CREATE TABLE IF NOT EXISTS hive_joy_bypasses (id TEXT PRIMARY KEY, path TEXT NOT NULL, violation_type TEXT NOT NULL, timestamp INTEGER NOT NULL)`);
    await execute(`CREATE TABLE IF NOT EXISTS hive_locks (id TEXT PRIMARY KEY, resource TEXT NOT NULL, owner_id TEXT NOT NULL, lock_code TEXT NOT NULL, expires_at INTEGER NOT NULL, acquired_at INTEGER NOT NULL)`);

    // 3. Queue / Job Management
    await execute(`CREATE TABLE IF NOT EXISTS hive_queue (id TEXT PRIMARY KEY, type TEXT NOT NULL, status TEXT NOT NULL, total_shards INTEGER NOT NULL, completed_shards INTEGER DEFAULT 0, metadata TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`);
    await execute(`CREATE TABLE IF NOT EXISTS hive_job_results (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, shard_id INTEGER NOT NULL, status TEXT NOT NULL, payload TEXT, error TEXT, priority INTEGER DEFAULT 0, timestamp INTEGER NOT NULL)`);

    // 4. Axiomatic Indexes
    await execute(`CREATE INDEX IF NOT EXISTS idx_hive_telemetry_task ON hive_llm_telemetry (task_id)`);
    await execute(`CREATE INDEX IF NOT EXISTS idx_hive_metabolic_task ON hive_metabolic_telemetry (task_id)`);
    await execute(`CREATE INDEX IF NOT EXISTS idx_hive_kb_key ON hive_kb (knowledge_key)`);
  }
}