/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Database adapter for BroccoliDB (@noorm/broccoliq).
 * Uses structured logging for production-grade observability.
 */

import { getDb, setDbPath, BufferedDbPool, SqliteQueue } from '@noorm/broccoliq';
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
   * 
   * @param dbPath Optional path to the SQLite database file.
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
      .execute();
    
    // Initialize the Sovereign Swarm Buffered Pool
    this.pool = new BufferedDbPool();

    // Initialize the Sovereign Queue
    this.queue = new SqliteQueue<DietCodeJob>({
      shardId: 'main',
      visibilityTimeoutMs: 60000,
    });
    
    this.isInitialized = true;
    // TEMPORARY: Integration hack - will be removed after full logging infrastructure integration
    // See: src/IMPLEMENTATION_SUMMARY.md
  }

  /**
   * Gets the Kysely instance for database operations.
   */
  static async db() {
    if (!this.isInitialized) {
      await this.init();
    }
    return getDb('main');
  }

  /**
   * Gets the high-performance buffered pool.
   */
  static async getPool(): Promise<BufferedDbPool> {
    if (!this.isInitialized) {
      await this.init();
    }
    return this.pool!;
  }

  /**
   * Gets the Sovereign Queue instance.
   */
  static async getQueue(): Promise<SqliteQueue<DietCodeJob>> {
    if (!this.isInitialized) {
      await this.init();
    }
    return this.queue!;
  }
}