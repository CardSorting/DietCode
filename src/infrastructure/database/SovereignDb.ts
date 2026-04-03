/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Database adapter for BroccoliDB (@noorm/broccoliq).
 * Uses structured logging for production-grade observability.
 */

import { getDb, setDbPath, BufferedDbPool, SqliteQueue } from '@noorm/broccoliq';
import { sql } from 'kysely';
import path from 'node:path';
import type { LogService } from '../../domain/logging/LogService';
import { JobType } from '../../domain/system/QueueProvider';

export interface DietCodeJob {
  type: JobType;
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

    await db.schema
      .createTable('joy_bypasses')
      .ifNotExists()
      .addColumn('path', 'text', (col) => col.primaryKey())
      .addColumn('violation_type', 'text', (col) => col.notNull())
      .addColumn('timestamp', 'int8', (col) => col.notNull())
      .execute();

    await db.schema
      .createTable('locks' as any)
      .ifNotExists()
      .addColumn('resource', 'text', (col) => col.primaryKey())
      .addColumn('owner', 'text', (col) => col.notNull())
      .addColumn('expires_at', 'int8', (col) => col.notNull())
      .execute();

    await db.schema
      .createTable('integrity_shard_results' as any)
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('correlationId', 'text', (col) => col.notNull())
      .addColumn('shardId', 'integer', (col) => col.notNull())
      .addColumn('status', 'text', (col) => col.notNull())
      .addColumn('result', 'text') // JSON
      .addColumn('error', 'text')
      .addColumn('timestamp', 'int8', (col) => col.notNull())
      .execute();

    await db.schema
      .createIndex('idx_integrity_correlation')
      .ifNotExists()
      .on('integrity_shard_results' as any)
      .column('correlationId')
      .execute();

    await db.schema
      .createTable('sovereign_tasks' as any)
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('type', 'text', (col) => col.notNull())
      .addColumn('status', 'text', (col) => col.notNull())
      .addColumn('total_shards', 'integer', (col) => col.notNull())
      .addColumn('completed_shards', 'integer', (col) => col.defaultTo(0))
      .addColumn('metadata', 'text') // JSON
      .addColumn('created_at', 'int8', (col) => col.notNull())
      .addColumn('updated_at', 'int8', (col) => col.notNull())
      .execute();

    await db.schema
      .createTable('job_results' as any)
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('taskId', 'text', (col) => col.notNull())
      .addColumn('shardId', 'integer', (col) => col.notNull())
      .addColumn('status', 'text', (col) => col.notNull())
      .addColumn('payload', 'text') // JSON result
      .addColumn('error', 'text')
      .addColumn('timestamp', 'int8', (col) => col.notNull())
      .execute();

    await db.schema
      .createIndex('idx_job_results_task')
      .ifNotExists()
      .on('job_results' as any)
      .column('taskId')
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
    try {
        (this.queue as any).setMaxListeners?.(200);
    } catch (e) { /* ignore */ }
    return this.queue!;
  }

  /**
   * Check if a path has already been bypassed.
   */
  static async isBypassed(path: string): Promise<boolean> {
    const db = await this.db();
    const result = await db
      .selectFrom('joy_bypasses' as any)
      .selectAll()
      .where('path', '=', path)
      .executeTakeFirst();
    return !!result;
  }

  /**
   * Record a bypass event for a specific path.
   */
  static async recordBypass(path: string, violationType: string): Promise<void> {
    const db = await this.db();
    await db
      .insertInto('joy_bypasses' as any)
      .values({
        path,
        violation_type: violationType,
        timestamp: Date.now()
      })
      .onConflict((oc: any) => oc.column('path').doUpdateSet({ timestamp: Date.now() }))
      .execute();
  }

  /**
   * Acquire a distributed lock for a resource.
   */
  static async acquireLock(resource: string, owner: string, ttlMs = 60000): Promise<boolean> {
    const db = await this.db();
    const now = Date.now();
    
    // Cleanup expired locks
    await db.deleteFrom('locks' as any)
      .where('resource', '=', resource)
      .where('expires_at', '<', now)
      .execute();

    try {
      await db.insertInto('locks' as any)
        .values({
          resource,
          owner,
          expires_at: now + ttlMs
        })
        .execute();
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Release a distributed lock.
   */
  static async releaseLock(resource: string, owner: string): Promise<void> {
    const db = await this.db();
    await db.deleteFrom('locks' as any)
      .where('resource', '=', resource)
      .where('owner', '=', owner)
      .execute();
  }

  /**
   * Record metabolic activity for a task.
   */
  static async recordMetabolicEvent(data: {
    taskId?: string,
    linesAdded?: number,
    linesDeleted?: number,
    reads?: number,
    writes?: number
  }): Promise<void> {
    const db = await this.db();
    await db.insertInto('metabolic_telemetry' as any)
      .values({
        id: Math.random().toString(36).substring(7),
        taskId: data.taskId || 'JOYZONING_CORE',
        linesAdded: data.linesAdded || 0,
        linesDeleted: data.linesDeleted || 0,
        reads: data.reads || 0,
        writes: data.writes || 0,
        timestamp: Date.now()
      })
      .execute();
  }

  /**
   * Record an audit log entry.
   */
  static async recordAudit(type: string, message: string, data?: any): Promise<void> {
    const db = await this.db();
    await db.insertInto('audit_log' as any)
      .values({
        id: Math.random().toString(36).substring(7),
        type,
        message,
        data: data ? JSON.stringify(data) : null,
        timestamp: Date.now()
      })
      .execute();
  }
}