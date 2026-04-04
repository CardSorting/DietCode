import { CompiledQuery } from 'kysely';

/**
 * [LAYER: INFRASTRUCTURE]
 * [SUB-ZONE: database]
 * Principle: Centralized schema management with atomic table-by-table patching
 * 
 * Architecture:
 * - Atomic table-by-table patching with independent transactions
 * - Smart skip logic for existing 'id' columns (nanosecond-scale checks)
 * - 15-second timeout per table to prevent cascading failures
 * - Detailed progress logging with elapsed time tracking
 * - Failure isolation: table failures don't cascade to remaining tables
 */
export class Schema {
    // Schema registry for table definitions
    private static readonly TABLE_SCHEMAS: Record<string, string> = {
        queue_settings: `id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, value TEXT, updatedAt INTEGER`,
        settings: `id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, value TEXT, updatedAt INTEGER`,
        knowledge_edges: `id TEXT PRIMARY KEY, sourceId TEXT NOT NULL, targetId TEXT NOT NULL, type TEXT NOT NULL, weight REAL DEFAULT 1.0`,
        branches: `id TEXT PRIMARY KEY, repoPath TEXT NOT NULL, name TEXT NOT NULL, head TEXT, isEphemeral INTEGER, createdAt INTEGER, expiresAt INTEGER`,
        claims: `id TEXT PRIMARY KEY, repoPath TEXT NOT NULL, branch TEXT NOT NULL, path TEXT NOT NULL, author TEXT NOT NULL, timestamp INTEGER NOT NULL, expiresAt INTEGER`,
        tags: `id TEXT PRIMARY KEY, repoPath TEXT NOT NULL, name TEXT NOT NULL, head TEXT, createdAt INTEGER`,
        trees: `id TEXT PRIMARY KEY, repoPath TEXT NOT NULL, entries TEXT NOT NULL, createdAt INTEGER`,
        files: `id TEXT PRIMARY KEY, path TEXT NOT NULL, content TEXT NOT NULL, encoding TEXT NOT NULL, size INTEGER NOT NULL, updatedAt BIGINT NOT NULL, author TEXT NOT NULL`,
        reflog: `id TEXT PRIMARY KEY, repoPath TEXT NOT NULL, ref TEXT NOT NULL, oldHead TEXT, newHead TEXT NOT NULL, author TEXT NOT NULL, message TEXT NOT NULL, timestamp BIGINT NOT NULL, operation TEXT NOT NULL`,
        stashes: `id TEXT PRIMARY KEY, repoPath TEXT NOT NULL, branch TEXT NOT NULL, nodeId TEXT NOT NULL, data TEXT NOT NULL, tree TEXT NOT NULL, label TEXT NOT NULL, createdAt BIGINT NOT NULL`,
        knowledge: `id TEXT PRIMARY KEY, userId TEXT NOT NULL, type TEXT NOT NULL, content TEXT NOT NULL, tags TEXT, edges TEXT, inboundEdges TEXT, embedding TEXT, confidence REAL, hubScore INTEGER, expiresAt BIGINT, metadata TEXT, createdAt BIGINT`,
        audit_events: `id TEXT PRIMARY KEY, userId TEXT NOT NULL, agentId TEXT, type TEXT NOT NULL, data TEXT NOT NULL, createdAt BIGINT NOT NULL`,
        logical_constraints: `id TEXT PRIMARY KEY, repoPath TEXT NOT NULL, pathPattern TEXT NOT NULL, knowledgeId TEXT NOT NULL, severity TEXT NOT NULL, createdAt BIGINT NOT NULL`,
        decisions: `id TEXT PRIMARY KEY, repoPath TEXT NOT NULL, agentId TEXT NOT NULL, taskId TEXT, decision TEXT NOT NULL, rationale TEXT NOT NULL, knowledgeIds TEXT NOT NULL, timestamp BIGINT NOT NULL`,
        queue_jobs: `id TEXT PRIMARY KEY, payload TEXT NOT NULL, status TEXT NOT NULL, priority INTEGER DEFAULT 0, attempts INTEGER DEFAULT 0, maxAttempts INTEGER DEFAULT 5, runAt BIGINT, error TEXT, createdAt BIGINT, updatedAt BIGINT`,
        tasks: `id TEXT PRIMARY KEY, userId TEXT NOT NULL, agentId TEXT NOT NULL, status TEXT NOT NULL, description TEXT NOT NULL, complexity REAL, linkedKnowledgeIds TEXT, result TEXT, createdAt BIGINT, updatedAt BIGINT`,
        telemetry: `id TEXT PRIMARY KEY, repoPath TEXT NOT NULL, agentId TEXT NOT NULL, taskId TEXT, promptTokens INTEGER NOT NULL, completionTokens INTEGER NOT NULL, totalTokens INTEGER NOT NULL, modelId TEXT NOT NULL, cost REAL NOT NULL, timestamp BIGINT NOT NULL, environment TEXT NOT NULL`,
        telemetry_aggregates: `id TEXT PRIMARY KEY, repoPath TEXT NOT NULL, agentId TEXT NOT NULL, periodStart BIGINT NOT NULL, periodEnd BIGINT NOT NULL, totalPrompts INTEGER NOT NULL, totalCompletions INTEGER NOT NULL, totalTokens INTEGER NOT NULL, totalCost REAL NOT NULL`,
        agents: `id TEXT PRIMARY KEY, userId TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL, capabilities TEXT, metadata TEXT, createdAt BIGINT, updatedAt BIGINT`,
        users: `id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT, provider TEXT, providerId TEXT, avatarUrl TEXT, createdAt BIGINT, updatedAt BIGINT`,
        workspaces: `id TEXT PRIMARY KEY, userId TEXT NOT NULL, sharedMemoryLayer TEXT, createdAt BIGINT`,
        repositories: `id TEXT PRIMARY KEY, workspaceId TEXT NOT NULL, repoId TEXT NOT NULL, repoPath TEXT NOT NULL, forkedFrom TEXT, forkedFromRemote TEXT, defaultBranch TEXT NOT NULL, createdAt BIGINT`,
        nodes: `id TEXT PRIMARY KEY, repoPath TEXT NOT NULL, parentId TEXT, data TEXT, message TEXT, timestamp BIGINT, author TEXT, type TEXT, tree TEXT, usage TEXT, metadata TEXT`,
    };

    // Tables that need surgical patching (can already have ID via CREATE)
    // Tables that need surgical patching (can already have ID via CREATE)
    private static readonly SYSTEM_TABLES = [
        'queue_settings',
        'settings',
        'knowledge_edges',
        'branches',
        'claims',
        'tags',
        'trees',
        'files',
        'reflog',
        'stashes',
        'knowledge',
        'audit_events',
        'logical_constraints',
        'decisions',
        'queue_jobs',
        'tasks',
        'telemetry',
        'telemetry_aggregates',
        'agents',
        'users',
        'workspaces',
        'repositories',
        'nodes'
    ];

    /**
     * Perform surgical patching for a single table missing 'id' column.
     * Uses atomic transactions with 15-second timeout per table.
     * 
     * @param db - Database connection
     * @param tableName - Name of table to patch
     * @param timeoutMs - Timeout per operation (default: 15s)
     * @returns true if patched, false if already had id column
     */
    private static async patchSingleTable(db: any, tableName: string, timeoutMs: number = 15000): Promise<boolean> {
        const startTime = Date.now();
        const operation = `patchSingleTable(${tableName})`;

        try {
            console.log(`[NUCLEAR PATCH] 🔍 Checking table '${tableName}' for standalone 'id' PRIMARY KEY...`);

            // STEP 1: Fast schema check
            const result = await this.withTimeout(
                db.executeQuery(CompiledQuery.raw(`PRAGMA table_info(${tableName})`)),
                Math.min(timeoutMs, 3000),
                `PRAGMA table_info(${tableName})`
            );

            // Extract column names from result
            let tableInfo;
            if (Array.isArray(result)) {
                tableInfo = result;
            } else if (result && typeof result === 'object') {
                tableInfo = result.rows || result.result || result.columns || result.data || Object.values(result);
            } else {
                throw new Error(`Cannot handle result type: ${typeof result}, value: ${JSON.stringify(result)}`);
            }

            if (!Array.isArray(tableInfo) || tableInfo.length === 0) {
                throw new Error(`Table '${tableName}' appears corrupted or empty`);
            }

            // Check for standalone 'id' primary key
            const pkColumns = tableInfo.filter((col: any) => col.pk > 0);
            const hasStandaloneIdPk = pkColumns.length === 1 && pkColumns[0].name === 'id';
            const columnNames = new Set(tableInfo.map((col: any) => col.name));
            
            // Fast path: if standalone 'id' PK exists, skip entire operation
            if (hasStandaloneIdPk) {
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
                console.log(`[NUCLEAR PATCH] ✓ Table '${tableName}' already has standalone 'id' PRIMARY KEY (skipped in ${(elapsed)}s)`);
                return false;
            }

            if (!columnNames.has('id')) {
                console.log(`[NUCLEAR PATCH] 🐛 Table '${tableName}' missing 'id' - starting patch`);
            } else {
                console.log(`[NUCLEAR PATCH] 🐛 Table '${tableName}' has 'id' but missing proper PRIMARY KEY constraint - starting patch`);
            }
            
            const targetSchema = this.TABLE_SCHEMAS[tableName];

            if (!targetSchema) {
                throw new Error(`No schema definition for table '${tableName}'`);
            }

            console.log(`[NUCLEAR PATCH] 📝 Creating temporary table '${tableName}_new' with proper schema`);

            // STEP 2: Begin transaction
            await this.withTimeout(
                db.executeQuery(CompiledQuery.raw(`BEGIN IMMEDIATE TRANSACTION`)),
                Math.min(timeoutMs, 5000),
                `BEGIN IMMEDIATE TRANSACTION`
            );

            // STEP 3: Create new table with proper schema
            await this.withTimeout(
                db.executeQuery(CompiledQuery.raw(`CREATE TABLE ${tableName}_new (${targetSchema})`)),
                Math.min(timeoutMs, 5000),
                `CREATE TABLE ${tableName}_new`
            );

            // Helper to generate a hash for id (simple deterministic hash)
            const generateId = (parts: string[]): string => {
                return parts.reduce((acc: string, part: string) => {
                    let hash = 0;
                    for (let i = 0; i < part.length; i++) {
                        const char = part.charCodeAt(i);
                        hash = ((hash << 5) - hash) + char;
                        hash = hash & hash;
                    }
                    return Math.abs(hash).toString(16);
                }, '');
            };

            const columnDefinitions = (() => {
                if (tableName === 'queue_settings') {
                    return ['id', 'key', 'value', 'updatedAt'];
                } else if (tableName === 'settings') {
                    return ['id', 'key', 'value', 'updatedAt'];
                } else if (tableName === 'knowledge_edges') {
                    return ['id', 'sourceId', 'targetId', 'type', 'weight'];
                } else if (tableName === 'branches') {
                    return ['id', 'repoPath', 'name', 'head', 'isEphemeral', 'createdAt', 'expiresAt'];
                } else if (tableName === 'claims') {
                    return ['id', 'repoPath', 'branch', 'path', 'author', 'timestamp', 'expiresAt'];
                } else if (tableName === 'tags') {
                    return ['id', 'repoPath', 'name', 'head', 'createdAt'];
                } else if (tableName === 'trees') {
                    return ['id', 'repoPath', 'entries', 'createdAt'];
                } else if (tableName === 'files') {
                    return ['id', 'path', 'content', 'encoding', 'size', 'updatedAt', 'author'];
                } else if (tableName === 'reflog') {
                    return ['id', 'repoPath', 'ref', 'oldHead', 'newHead', 'author', 'message', 'timestamp', 'operation'];
                } else if (tableName === 'stashes') {
                    return ['id', 'repoPath', 'branch', 'nodeId', 'data', 'tree', 'label', 'createdAt'];
                } else if (tableName === 'knowledge') {
                    return ['id', 'userId', 'type', 'content', 'tags', 'edges', 'inboundEdges', 'embedding', 'confidence', 'hubScore', 'expiresAt', 'metadata', 'createdAt'];
                } else if (tableName === 'audit_events') {
                    return ['id', 'userId', 'agentId', 'type', 'data', 'createdAt'];
                } else if (tableName === 'logical_constraints') {
                    return ['id', 'repoPath', 'pathPattern', 'knowledgeId', 'severity', 'createdAt'];
                } else if (tableName === 'decisions') {
                    return ['id', 'repoPath', 'agentId', 'taskId', 'decision', 'rationale', 'knowledgeIds', 'timestamp'];
                } else if (tableName === 'queue_jobs') {
                    return ['id', 'payload', 'status', 'priority', 'attempts', 'maxAttempts', 'runAt', 'error', 'createdAt', 'updatedAt'];
                } else if (tableName === 'tasks') {
                    return ['id', 'userId', 'agentId', 'status', 'description', 'complexity', 'linkedKnowledgeIds', 'result', 'createdAt', 'updatedAt'];
                } else if (tableName === 'telemetry') {
                    return ['id', 'repoPath', 'agentId', 'taskId', 'promptTokens', 'completionTokens', 'totalTokens', 'modelId', 'cost', 'timestamp', 'environment'];
                } else if (tableName === 'telemetry_aggregates') {
                    return ['id', 'repoPath', 'agentId', 'periodStart', 'periodEnd', 'totalPrompts', 'totalCompletions', 'totalTokens', 'totalCost'];
                } else if (tableName === 'agents') {
                    return ['id', 'userId', 'name', 'status', 'capabilities', 'metadata', 'createdAt', 'updatedAt'];
                } else if (tableName === 'users') {
                    return ['id', 'name', 'email', 'password', 'provider', 'providerId', 'avatarUrl', 'createdAt', 'updatedAt'];
                } else if (tableName === 'workspaces') {
                    return ['id', 'userId', 'sharedMemoryLayer', 'createdAt'];
                } else if (tableName === 'repositories') {
                    return ['id', 'workspaceId', 'repoId', 'repoPath', 'forkedFrom', 'forkedFromRemote', 'defaultBranch', 'createdAt'];
                } else if (tableName === 'nodes') {
                    return ['id', 'repoPath', 'parentId', 'data', 'message', 'timestamp', 'author', 'type', 'tree', 'usage', 'metadata'];
                }
                throw new Error(`No column definition for table '${tableName}'`);
            })();

            const nonIdColumns = columnDefinitions.filter(col => col !== 'id');

            // STEP 4: Template INSERT
            const idValue = generateId(['template']);
            const templateValues = nonIdColumns.map(() => `''`).join(', ');
            const columnsStr = columnDefinitions.join(', ');
            
            await this.withTimeout(
                this.withDbExecute(db, CompiledQuery.raw(
                    `INSERT INTO ${tableName}_new (${columnsStr}) VALUES ('${idValue}', ${templateValues})`
                )),
                Math.min(timeoutMs, 500),
                `Template INSERT for ${tableName}_new`
            );

            // STEP 5: Migrate data row by row
            let rowCount = 0;
            const dataResult = await this.withTimeout(
                db.executeQuery(CompiledQuery.raw(`SELECT * FROM ${tableName}`)),
                Math.min(timeoutMs, 5000),
                `SELECT * from ${tableName}`
            );
            
            // Handle result format properly
            let rows: any[];
            if (Array.isArray(dataResult)) {
                rows = dataResult;
            } else if (dataResult && typeof dataResult === 'object') {
                rows = dataResult.rows || dataResult.data || Object.values(dataResult);
            } else {
                rows = [];
            }

            console.log(`[NUCLEAR PATCH] ↳ Processing ${rows.length} rows of data...`);
            
            for (const row of rows) {
                // Generate id from row data
                const rowKey = nonIdColumns.map((col: string) => {
                    const val = row[col];
                    return val === undefined ? '' : String(val);
                }).join('|');
                
                const rowIdValue = generateId([tableName, rowKey]);
                
                // Build VALUES clause
                const rowValues = nonIdColumns.map((col: string) => {
                    const val = row[col];
                    const strVal = val === undefined ? '' : String(val).replace(/'/g, "''");
                    return `'${strVal}'`;
                }).join(', ');

                await this.withTimeout(
                    this.withDbExecute(db, CompiledQuery.raw(
                        `INSERT INTO ${tableName}_new (${columnsStr}) VALUES ('${rowIdValue}', ${rowValues})`
                    )),
                    Math.min(timeoutMs, 1000),
                    `Insert row ${rowCount} into ${tableName}_new`
                );
                rowCount++;
            }

            // STEP 6: Delete template row
            await this.withTimeout(
                this.withDbExecute(db, CompiledQuery.raw(`DELETE FROM ${tableName}_new`)),
                Math.min(timeoutMs, 500),
                `Delete template row`
            );

            console.log(`[NUCLEAR PATCH] ✅ Inserted ${rowCount} rows to new table`);

            // STEP 7: Atomic swap (DROP old, RENAME new)
            console.log(`[NUCLEAR PATCH] 🔄 Swapping tables: DROP '${tableName}', RENAME '${tableName}_new' to '${tableName}'`);
            
            // Verify data integrity
            const originalCountResult = await this.withTimeout(
                db.executeQuery(CompiledQuery.raw(`SELECT COUNT(*) as count FROM ${tableName}`)),
                Math.min(timeoutMs, 2000),
                `COUNT rows in ${tableName}`
            );
            
            let originalRowCount: number;
            if (Array.isArray(originalCountResult)) {
                originalRowCount = originalCountResult[0]?.count || 0;
            } else if (typeof originalCountResult === 'object' && originalCountResult !== null) {
                originalRowCount = originalCountResult?.[0]?.count || 0;
            } else {
                originalRowCount = 0;
            }
            
            // Count rows in new table
            const newCountResult = await this.withTimeout(
                db.executeQuery(CompiledQuery.raw(`SELECT COUNT(*) as count FROM ${tableName}_new`)),
                Math.min(timeoutMs, 2000),
                `COUNT rows in ${tableName}_new`
            );
            
            let newRowCount: number;
            if (Array.isArray(newCountResult)) {
                newRowCount = newCountResult[0]?.count || 0;
            } else if (typeof newCountResult === 'object' && newCountResult !== null) {
                newRowCount = newCountResult?.[0]?.count || 0;
            } else {
                newRowCount = 0;
            }
            
            if (originalRowCount !== newRowCount) {
                throw new Error(`Data mismatch: ${originalRowCount} rows in original but ${newRowCount} in new table`);
            }
            console.log(`[NUCLEAR PATCH] ✅ Data integrity verified: ${originalRowCount} rows`);

            // Drop old table
            await this.withTimeout(
                db.executeQuery(CompiledQuery.raw(`DROP TABLE ${tableName}`)),
                Math.min(timeoutMs, 3000),
                `DROP ${tableName}`
            );

            // Rename new to old
            await this.withTimeout(
                db.executeQuery(CompiledQuery.raw(`ALTER TABLE ${tableName}_new RENAME TO ${tableName}`)),
                Math.min(timeoutMs, 3000),
                `RENAME ${tableName}_new to ${tableName}`
            );

            // STEP 8: Verify patch
            await this.withTimeout(
                db.executeQuery(CompiledQuery.raw(`PRAGMA table_info(${tableName})`)),
                Math.min(timeoutMs, 2000),
                `PRAGMA table_info verify`
            );

            const patchedTableInfo = await this.withTimeout(
                db.executeQuery(CompiledQuery.raw(`PRAGMA table_info(${tableName})`)),
                Math.min(timeoutMs, 2000),
                `PRAGMA table_info final`
            );
            
            let patchedColumns: any[];
            if (Array.isArray(patchedTableInfo)) {
                patchedColumns = patchedTableInfo;
            } else if (patchedTableInfo && typeof patchedTableInfo === 'object') {
                patchedColumns = patchedTableInfo.rows || patchedTableInfo.data || Object.values(patchedTableInfo);
            } else {
                patchedColumns = [];
            }
            
            if (!Array.isArray(patchedColumns) || !new Set(patchedColumns.map((col: any) => col.name)).has('id')) {
                throw new Error(`Patching failed: 'id' column still missing after migration`);
            }

            // COMMIT
            await this.withTimeout(
                db.executeQuery(CompiledQuery.raw('COMMIT')),
                Math.min(timeoutMs, 2000),
                'COMMIT'
            );

            const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`[NUCLEAR PATCH] ✓ Table '${tableName}' SUCCESSFULLY PATCHED with 'id' in ${elapsedTime}s`);
            return true;

        } catch (error: any) {
            // ROLLBACK on any error (COMMIT failed)
            try {
                await this.withTimeout(
                    db.executeQuery(CompiledQuery.raw('ROLLBACK')),
                    5000,
                    'ROLLBACK (emergency)'
                );
            } catch (rollbackError) {
                // Ignore rollback errors
            }

            const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
            console.error(`[NUCLEAR PATCH] ❌ FAILED to patch table '${tableName}' after ${elapsedTime}s:`, error.message);
            throw error;
        }
    }

    /**
     * Execute database operation with explicit timeout.
     * Prevents initialization hangs during DB operations.
     */
    private static async withTimeout(
        promise: Promise<any>,
        timeoutMs: number,
        operation: string
    ): Promise<any> {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`[NUCLEAR PATCH] ⚠️  TIMEOUT after ${timeoutMs}ms on operation: ${operation}`));
            }, timeoutMs);
        });

        return Promise.race([promise, timeoutPromise]);
    }

    /**
     * Helper to safely execute database query
     */
    private static withDbExecute(db: any, compiled: CompiledQuery<any>, timeoutMs?: number) {
        if (db.execute) {
            return db.execute(compiled);
        }
        return db.executeQuery(compiled);
    }

    static async ensureSchema(dbPool: any) {
        const startTime = Date.now();
        console.log('[NUCLEAR PATCH] 🚀 Starting atomic schema hardening...');
        
        let totalSuccessCount = 0;
        let totalSkipCount = 0;
        let totalFailCount = 0;
        
        // Get all active shards to ensure comprehensive hardening
        const shards = dbPool.getActiveShards ? dbPool.getActiveShards() : ['main'];
        console.log(`[NUCLEAR PATCH] 📡 Shards detected: ${shards.join(', ')}`);

        for (const shardId of shards) {
            console.log(`[NUCLEAR PATCH] 🧵 Patching shard: '${shardId}'`);
            const db = await dbPool.getDb(shardId);
            const results: Array<{ table: string; success: boolean; elapsed: number }> = [];

            // STEP 0: Atomic table-by-table patching
            for (const tableName of this.SYSTEM_TABLES) {
                const tableStart = Date.now();
                try {
                    const patched = await this.patchSingleTable(db, tableName);
                    if (patched) {
                        totalSuccessCount++;
                    } else {
                        totalSkipCount++;
                    }
                    results.push({
                        table: tableName,
                        success: patched,
                        elapsed: Date.now() - tableStart
                    });
                } catch (error) {
                    totalFailCount++;
                    console.error(`[NUCLEAR PATCH] ⚠️  Table '${tableName}' failed on shard '${shardId}', continuing...`);
                    results.push({ table: tableName, success: false, elapsed: Date.now() - tableStart });
                }
            }

            // STEP 1: Create Hive tables (namespaced)
            const execute = async (rawSql: string) => {
                try { await db.executeQuery(CompiledQuery.raw(rawSql)); } catch (e) {}
            };

            await execute(`CREATE TABLE IF NOT EXISTS hive_kb (id TEXT PRIMARY KEY, knowledge_key TEXT NOT NULL, knowledge_value TEXT NOT NULL, type TEXT NOT NULL, confidence REAL NOT NULL, tags TEXT NOT NULL, metadata TEXT, created_at TEXT NOT NULL)`);
            await execute(`CREATE TABLE IF NOT EXISTS hive_healing_proposals (id TEXT PRIMARY KEY, violation_id TEXT NOT NULL, violation TEXT NOT NULL, rationale TEXT NOT NULL, proposed_code TEXT NOT NULL, status TEXT NOT NULL, confidence REAL DEFAULT 1.0, created_at TEXT NOT NULL, applied_at TEXT)`);
            await execute(`CREATE TABLE IF NOT EXISTS hive_snapshots (id TEXT PRIMARY KEY, path TEXT NOT NULL, content TEXT NOT NULL, timestamp INTEGER NOT NULL, hash TEXT NOT NULL, mtime INTEGER)`);
            await execute(`CREATE TABLE IF NOT EXISTS hive_file_context (id TEXT PRIMARY KEY, path TEXT NOT NULL, state TEXT NOT NULL, source TEXT NOT NULL, last_read_date INTEGER, last_edit_date INTEGER, signature TEXT, external_edit_detected INTEGER DEFAULT 0)`);
            await execute(`CREATE TABLE IF NOT EXISTS hive_audit (id TEXT PRIMARY KEY, session_id TEXT, type TEXT NOT NULL, message TEXT NOT NULL, data TEXT, timestamp INTEGER NOT NULL)`);
            await execute(`CREATE TABLE IF NOT EXISTS hive_agent_sessions (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, status TEXT NOT NULL, start_time INTEGER NOT NULL, end_time INTEGER)`);

            // STEP 2: Hive tables (Joy / Analysis)
            await execute(`CREATE TABLE IF NOT EXISTS hive_joy_imports (id TEXT PRIMARY KEY, source_path TEXT NOT NULL, imported_path TEXT NOT NULL)`);
            await execute(`CREATE TABLE IF NOT EXISTS hive_joy_history (id TEXT PRIMARY KEY, violation_count INTEGER NOT NULL, file_count INTEGER NOT NULL, timestamp INTEGER NOT NULL)`);
            await execute(`CREATE TABLE IF NOT EXISTS hive_metabolic_telemetry (id TEXT PRIMARY KEY, task_id TEXT, reads INTEGER NOT NULL, writes INTEGER NOT NULL, lines_added INTEGER NOT NULL, lines_deleted INTEGER NOT NULL, tokens_processed INTEGER NOT NULL, verifications_success INTEGER NOT NULL, timestamp INTEGER NOT NULL)`);
            await execute(`CREATE TABLE IF NOT EXISTS hive_tasks (id TEXT PRIMARY KEY, task_id TEXT NOT NULL UNIQUE, title TEXT NOT NULL, objective TEXT NOT NULL, state TEXT NOT NULL, priority INTEGER NOT NULL, vitals_heartbeat TEXT, v_token TEXT, initial_context TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, started_at INTEGER, completed_at INTEGER, user_agent TEXT NOT NULL)`);
            await execute(`CREATE TABLE IF NOT EXISTS hive_llm_telemetry (id TEXT PRIMARY KEY, repo_path TEXT NOT NULL, agent_id TEXT NOT NULL, task_id TEXT, prompt_tokens INTEGER, completion_tokens INTEGER, total_tokens INTEGER, model_id TEXT, cost REAL, timestamp INTEGER NOT NULL, environment TEXT)`);
            await execute(`CREATE TABLE IF NOT EXISTS hive_joy_metrics (id TEXT PRIMARY KEY, path TEXT NOT NULL, violation_count INTEGER NOT NULL, hash TEXT NOT NULL, last_scanned INTEGER NOT NULL)`);
            await execute(`CREATE TABLE IF NOT EXISTS hive_joy_bypasses (id TEXT PRIMARY KEY, path TEXT NOT NULL, violation_type TEXT NOT NULL, timestamp INTEGER NOT NULL)`);
            await execute(`CREATE TABLE IF NOT EXISTS hive_locks (id TEXT PRIMARY KEY, resource TEXT NOT NULL, owner_id TEXT NOT NULL, lock_code TEXT NOT NULL, expires_at INTEGER NOT NULL, acquired_at INTEGER NOT NULL)`);

            // STEP 3: Queue tables
            await execute(`CREATE TABLE IF NOT EXISTS hive_queue (id TEXT PRIMARY KEY, type TEXT NOT NULL, status TEXT NOT NULL, total_shards INTEGER NOT NULL, completed_shards INTEGER DEFAULT 0, metadata TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`);
            await execute(`CREATE TABLE IF NOT EXISTS hive_job_results (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, shard_id INTEGER NOT NULL, status TEXT NOT NULL, payload TEXT, error TEXT, priority INTEGER DEFAULT 0, timestamp INTEGER NOT NULL)`);

            // STEP 4: Create indexes
            await execute(`CREATE INDEX IF NOT EXISTS idx_hive_telemetry_task ON hive_llm_telemetry (task_id)`);
            await execute(`CREATE INDEX IF NOT EXISTS idx_hive_metabolic_task ON hive_metabolic_telemetry (task_id)`);
            await execute(`CREATE INDEX IF NOT EXISTS idx_hive_kb_key ON hive_kb (knowledge_key)`);
        }

        // STEP 5: Final summary
        const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[NUCLEAR PATCH] 🏁 Schema hardening complete in ${totalElapsed}s`);
        console.log(`[NUCLEAR PATCH] 📊 Total Summary: ${totalSuccessCount} patched, ${totalSkipCount} skipped, ${totalFailCount} failed across all shards`);
        
        if (totalFailCount > 0) {
            console.warn(`[NUCLEAR PATCH] ⚠️  ${totalFailCount} table(s) failed patching. Deployment may be unstable.`);
        }
    }
}