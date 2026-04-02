/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Database adapter for BroccoliDB (@noorm/broccoliq).
 * Uses structured logging for production-grade observability.
 */

import { getDb, setDbPath, BufferedDbPool, SqliteQueue } from '@noorm/broccoliq';
import { sql } from 'kysely';
import path from 'node:path';
import type { LogService } from '../../domain/logging/LogService';

export interface DietCodeJob {
  type: 'KNOWLEDGE_INGEST' | 'CODE_ANALYZE' | 'SELF_HEAL';
  payload: any;
}

export class SovereignDb {
  private static isInitialized = false;
  private static pool: BufferedDbPool | null = null;
  private static queue: SqliteQueue<DietCodeJob> | null = null;

  /**
   * Initializes the database connection and the high-performance pool.
   */
  static async init(dbPath?: string) {
    if (this.isInitialized) return;

    const resolvedPath = dbPath || path.resolve(process.cwd(), 'sovereign.db');
    setDbPath(resolvedPath);

    // Initialize Schema
    const db = await getDb('main');
    
    await db.schema
      .createTable('knowledge_base')
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('knowledge_key', 'text', (col) => col.notNull())
      .addColumn('knowledge_value', 'text', (col) => col.notNull())
      .addColumn('type', 'text', (col) => col.notNull())
      .addColumn('confidence', 'float8', (col) => col.notNull())
      .addColumn('tags', 'text', (col) => col.notNull())
      .addColumn('metadata', 'text')
      .addColumn('createdAt', 'text', (col) => col.notNull())
      .execute();

    await db.schema
      .createTable('healing_proposals')
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('violationId', 'text', (col) => col.notNull())
      .addColumn('violation', 'text', (col) => col.notNull()) // JSON string
      .addColumn('rationale', 'text', (col) => col.notNull())
      .addColumn('proposedCode', 'text', (col) => col.notNull())
      .addColumn('status', 'text', (col) => col.notNull())
      .addColumn('confidence', 'float8', (col) => col.defaultTo(1.0))
      .addColumn('createdAt', 'text', (col) => col.notNull())
      .addColumn('appliedAt', 'text')
      .execute();

    await db.schema
      .createTable('snapshots' as any)
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('path', 'text', (item) => item.notNull())
      .addColumn('content', 'text', (item) => item.notNull())
      .addColumn('timestamp', 'int8', (item) => item.notNull())
      .addColumn('hash', 'text', (item) => item.notNull())
      .addColumn('mtime', 'int8')
      .execute();

    await db.schema
      .createTable('file_context')
      .ifNotExists()
      .addColumn('path', 'text', (col) => col.primaryKey())
      .addColumn('state', 'text', (col) => col.notNull())
      .addColumn('source', 'text', (col) => col.notNull())
      .addColumn('lastReadDate', 'int8')
      .addColumn('lastEditDate', 'int8')
      .addColumn('signature', 'text')
      .addColumn('externalEditDetected', 'boolean', (col) => col.defaultTo(false))
      .execute();

    await db.schema
      .createTable('audit_log')
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('sessionId', 'text')
      .addColumn('type', 'text', (col) => col.notNull())
      .addColumn('message', 'text', (col) => col.notNull())
      .addColumn('data', 'text')
      .addColumn('timestamp', 'int8', (col) => col.notNull())
      .execute();

    await db.schema
      .createTable('agent_sessions')
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('agentId', 'text', (item) => item.notNull())
      .addColumn('status', 'text', (item) => item.notNull())
      .addColumn('startTime', 'int8', (item) => item.notNull())
      .addColumn('endTime', 'int8')
      .execute();

    await db.schema
      .createTable('joy_imports')
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('source_path', 'text', (col) => col.notNull())
      .addColumn('imported_path', 'text', (col) => col.notNull())
      .execute();

    await db.schema
      .createTable('joy_history')
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('score', 'float8', (col) => col.notNull())
      .addColumn('violation_count', 'integer', (col) => col.notNull())
      .addColumn('file_count', 'integer', (col) => col.notNull())
      .addColumn('timestamp', 'int8', (col) => col.notNull())
      .execute();

    await db.schema
      .createIndex('idx_joy_imports_source')
      .ifNotExists()
      .on('joy_imports')
      .column('source_path')
      .execute();

    await db.schema
      .createIndex('idx_joy_imports_imported')
      .ifNotExists()
      .on('joy_imports')
      .column('imported_path')
      .execute();

    await db.schema
      .createTable('tasks')
      .ifNotExists()
      .addColumn('task_id', 'text', (col) => col.primaryKey())
      .addColumn('title', 'text', (col) => col.notNull())
      .addColumn('objective', 'text', (col) => col.notNull())
      .addColumn('state', 'text', (col) => col.notNull())
      .addColumn('priority', 'integer', (col) => col.notNull())
      .addColumn('sim_integrity', 'float8')
      .addColumn('vitals_heartbeat', 'text') // JSON
      .addColumn('v_token', 'text')
      .addColumn('initial_context', 'text')
      .addColumn('created_at', 'int8', (col) => col.notNull())
      .addColumn('updated_at', 'int8', (col) => col.notNull())
      .addColumn('started_at', 'int8')
      .addColumn('completed_at', 'int8')
      .addColumn('user_agent', 'text', (col) => col.notNull())
      .execute();

    // Pass 17: Telemetry & Metabolic Infrastructure
    await db.schema
      .createTable('telemetry' as any)
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('repoPath', 'text', (col) => col.notNull())
      .addColumn('agentId', 'text', (col) => col.notNull())
      .addColumn('taskId', 'text')
      .addColumn('promptTokens', 'integer')
      .addColumn('completionTokens', 'integer')
      .addColumn('totalTokens', 'integer')
      .addColumn('modelId', 'text')
      .addColumn('cost', 'float8')
      .addColumn('timestamp', 'int8', (col) => col.notNull())
      .addColumn('environment', 'text')
      .execute();

    await db.schema
      .createTable('metabolic_telemetry' as any)
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('taskId', 'text')
      .addColumn('tokensProcessed', 'integer')
      .addColumn('verificationsSuccess', 'integer')
      .addColumn('linesAdded', 'integer')
      .addColumn('linesDeleted', 'integer')
      .addColumn('reads', 'integer')
      .addColumn('writes', 'integer')
      .addColumn('cognitiveHeat', 'float8')
      .addColumn('architecturalDecay', 'float8')
      .addColumn('doubtSignal', 'float8')
      .addColumn('timestamp', 'int8', (col) => col.notNull())
      .execute();

    await db.schema
      .createIndex('idx_telemetry_taskId')
      .ifNotExists()
      .on('telemetry' as any)
      .column('taskId')
      .execute();

    await db.schema
      .createIndex('idx_metabolic_taskId')
      .ifNotExists()
      .on('metabolic_telemetry' as any)
      .column('taskId')
      .execute();

    await db.schema
      .createTable('joy_metrics' as any)
      .ifNotExists()
      .addColumn('path', 'text', (col) => col.primaryKey())
      .addColumn('violation_count', 'integer', (col) => col.notNull())
      .addColumn('hash', 'text', (col) => col.notNull())
      .addColumn('last_scanned', 'int8', (col) => col.notNull())
      .execute();
    
    // Pass 6: Concurrency and Deadlock Mitigation
    await sql`PRAGMA journal_mode=WAL;`.execute(db as any);
    await sql`PRAGMA busy_timeout=5000;`.execute(db as any);

    this.isInitialized = true;
    
    this.pool = new BufferedDbPool();
    this.queue = new SqliteQueue<DietCodeJob>({
      shardId: 'main',
      visibilityTimeoutMs: 60000,
    });
  }

  static async db() {
    if (!this.isInitialized) {
      await this.init();
    }
    return getDb('main');
  }

  static async getPool(): Promise<BufferedDbPool> {
    if (!this.isInitialized) {
      await this.init();
    }
    return this.pool!;
  }

  static async getQueue(): Promise<SqliteQueue<DietCodeJob>> {
    if (!this.isInitialized) {
      await this.init();
    }
    return this.queue!;
  }
}