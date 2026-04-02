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
  type: 'KNOWLEDGE_INGEST' | 'CODE_ANALYZE';
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
    
    // Pass 6: Concurrency and Deadlock Mitigation
    await sql`PRAGMA journal_mode=WAL;`.execute(db);
    await sql`PRAGMA busy_timeout=5000;`.execute(db);

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