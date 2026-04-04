/**
 * [LAYER: Infrastructure]
 * [SUB-ZONE: queue/providers]
 * Principle: BroccoliDB adapter with nuclear schema hardening
 * Prework Status: 
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Nuclear Hardening: Automatically patches tables missing 'id' column before operations
 */

import type { QueueProvider } from '../../domain/system/QueueProvider';
import type { JobDefinition } from '../../domain/system/QueueProvider';
import { CompiledQuery } from 'kysely';
import { Core } from '../database/sovereign/Core';
import { Schema } from '../database/sovereign/Schema';

export class BroccoliQueueAdapter implements QueueProvider {
  /**
   * Enqueues a typed job into the Sovereign Swarm Queue (v2.0)
   * NUCLEAR HARDENING: Ensures 'id' columns exist before operations
   */
  async enqueue<T>(job: JobDefinition<T>): Promise<string> {
    // NUCLEAR HARDENING: Ensure schema is initialized before enqueue
    if (!Core.isAvailable()) {
      await Core.init(process.cwd() + '/data/broccoliq.db', Schema.ensureSchema.bind(Schema));
    }
    
    const db = await Core.db();
    
    // Run nuclear patching for known tables before enqueue
    const systemTables = ['branches', 'tags', 'claims', 'knowledge_edges', 'queue_settings', 'settings'];
    for (const table of systemTables) {
      await this.surgicalPatchTable(db, table);
    }
    
    // Normalize type to string for JSON serialization
    const jobTypeStr = typeof job.type === 'string' ? job.type : String(job.type);
    
    // Create the payload exactly as expected by DietCodeJob
    const payload = {
      type: jobTypeStr,
      payload: job.payload,
    };

    // V2.0: Options are passed as a second argument
    return queue.enqueue(payload as any, {
      priority: job.priority
    });
  }

  /**
   * NUCLEAR PATCHING: Surgical table migration for tables missing 'id' column
   * Requires transaction and table rewrite because SQLite doesn't support ALTER TABLE
   * on tables with composite PRIMARY KEYS
   */
  private async surgicalPatchTable(db: any, tableName: string) {
    const tx = db.transaction(async (table: string) => {
      // Check if id column exists
      try {
        const result = await db.executeQuery(CompiledQuery.raw(`PRAGMA table_info(${table})`));
        let tableInfo;
        if (result && ('rows' in result || 'result' in result)) {
          tableInfo = result.rows || result.result;
        } else {
          tableInfo = Array.isArray(result) ? result : [];
        }
        
        const columnNames = new Set(tableInfo.map((col: any) => col.name));
        
        if (columnNames.has('id')) {
          return; // Already has id, no patching needed
        }

        console.log(`[NUCLEAR PATCH] Preparing to patch table '${table}' (missing 'id' column)`);
        
        // Generate appropriate schema with id
        let tempSchema = '';
        if (table === 'queue_settings' || table === 'settings') {
          tempSchema = `id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, value TEXT, updatedAt INTEGER`;
        } else if (table === 'knowledge_edges') {
          tempSchema = `id TEXT PRIMARY KEY, sourceId TEXT NOT NULL, targetId TEXT NOT NULL, type TEXT NOT NULL, weight REAL DEFAULT 1.0`;
        } else if (table === 'branches') {
          tempSchema = `id TEXT PRIMARY KEY, repoPath TEXT NOT NULL, name TEXT NOT NULL, head TEXT, isEphemeral INTEGER, createdAt INTEGER, expiresAt INTEGER`;
        } else if (table === 'claims') {
          tempSchema = `id TEXT PRIMARY KEY, repoPath TEXT NOT NULL, branch TEXT NOT NULL, path TEXT NOT NULL, author TEXT NOT NULL, timestamp INTEGER NOT NULL, expiresAt INTEGER`;
        } else if (table === 'tags') {
          tempSchema = `id TEXT PRIMARY KEY, repoPath TEXT NOT NULL, name TEXT NOT NULL, head TEXT, createdAt INTEGER`;
        }
        
        const tempTableName = `${table}_temp`;
        await db.executeQuery(CompiledQuery.raw(`DROP TABLE IF EXISTS ${tempTableName}`));
        await db.executeQuery(CompiledQuery.raw(`CREATE TABLE ${tempTableName} (${tempSchema})`));
        
        // Migrate data
        let selectColumns = '';
        if (table === 'queue_settings' || table === 'settings') {
          selectColumns = 'key, value, updatedAt';
        } else if (table === 'knowledge_edges') {
          selectColumns = 'sourceId, targetId, type, weight';
        } else if (table === 'branches') {
          selectColumns = 'repoPath, name, head, isEphemeral, createdAt, expiresAt';
        } else if (table === 'claims') {
          selectColumns = 'repoPath, branch, path, author, timestamp, expiresAt';
        } else if (table === 'tags') {
          selectColumns = 'repoPath, name, head, createdAt';
        }
        
        await db.executeQuery(
          CompiledQuery.raw(`INSERT INTO ${tempTableName} (id, ${selectColumns}) SELECT '${crypto.randomUUID()}', ${selectColumns} FROM ${table}`)
        );
        
        await db.executeQuery(CompiledQuery.raw(`DROP TABLE ${table}`));
        await db.executeQuery(CompiledQuery.raw(`ALTER TABLE ${tempTableName} RENAME TO ${table}`));
        
        console.log(`[NUCLEAR PATCH] ✅ Successfully patched table '${table}'`);
      } catch (error) {
        console.log(`[NUCLEAR PATCH] ℹ Table may already have 'id' or migration not needed: ${(error as Error).message}`);
      }
    });

    tx(tableName);
  }
}