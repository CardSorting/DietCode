import { getDb, setDbPath, dbPool, SqliteQueue } from '@noorm/broccoliq';
import { sql } from 'kysely';
import path from 'node:path';
import fs from 'node:fs';
import { JobType } from '../../../domain/system/QueueProvider';

export interface DietCodeJob {
  type: JobType;
  payload: any;
  priority?: number;
}

/**
 * Sovereign Hive Orchestrator (Core)
 * 
 * Gateway to the sharded, buffered persistence layer of BroccoliQ v2.0.
 * Implements the Zero-Shim pattern for high-velocity agent operations.
 */
export class Core {
  private static isInitialized = false;
  public static pool: typeof dbPool = dbPool;
  private static queue: SqliteQueue<DietCodeJob> | null = null;

  static async init(dbPath?: string, ensureSchemaFn?: (db: any) => Promise<void>) {
    if (this.isInitialized) return;

    const resolvedPath = dbPath || path.resolve(process.cwd(), 'sovereign.db');
    const lockPath = resolvedPath + '.lock';
    
    // Level 10 Sovereignty: Environment Calibration
    setDbPath(resolvedPath);

    // Pass 20: Atomic Initialization Guard (File-based)
    let hasLock = false;
    for (let attempts = 0; attempts < 60; attempts++) {
        try {
            if (!fs.existsSync(lockPath)) {
                fs.writeFileSync(lockPath, process.pid.toString());
                hasLock = true;
                break;
            } else {
                const stats = fs.statSync(lockPath);
                if (Date.now() - stats.mtimeMs > 30000) {
                    try { fs.unlinkSync(lockPath); } catch (e) {}
                    continue;
                }
            }
        } catch (e) { /* Race condition */ }
        await new Promise(r => setTimeout(r, 500));
    }

    // Pass 20: Immediate Concurrency and Deadlock Mitigation
    const db = await getDb('main');
    
    // Explicit hardening remains for sovereign integrity
    await sql`PRAGMA journal_mode=WAL;`.execute(db as any);
    await sql`PRAGMA busy_timeout=30000;`.execute(db as any);

    try {
        if (hasLock && ensureSchemaFn) {
            await ensureSchemaFn(db);
        }
    } finally {
        if (hasLock) {
            try { fs.unlinkSync(lockPath); } catch (e) {}
        }
    }

    this.isInitialized = true;
    
    // V2: Shard-aware High-Throughput Queue
    this.queue = new SqliteQueue<DietCodeJob>({
      shardId: 'main',
      visibilityTimeoutMs: 60000,
    });

    console.log('[CORE] Sovereign Hive initialized (v2.0 Architecture)');
  }

  /**
   * High-throughput write via Hive Buffer (Write-Behind)
   * Targets Level 7 Memory Buffer first, synced to disk in heartbeats.
   */
  static async push(op: any, agentId?: string) {
    if (!this.isInitialized) await this.init();
    return this.pool.push(op, agentId);
  }

  /**
   * Fluid read with Hive Consistency
   * Automatically merges disk state with active memory buffers.
   */
  static async selectWhere(table: string, where: any, options?: any) {
    if (!this.isInitialized) await this.init();
    return (this.pool as any).selectWhere(table, where, undefined, options);
  }

  /**
   * Sovereign Shadow Execution
   * Wraps multiple operations in an atomic Agent Shadow for isolated consistency.
   */
  static async runInShadow<T>(agentId: string, fn: (agentId: string) => Promise<T>): Promise<T> {
    if (!this.isInitialized) await this.init();
    await this.pool.beginWork(agentId);
    try {
      const result = await fn(agentId);
      await this.pool.commitWork(agentId);
      return result;
    } catch (e) {
      // Shadows in v2 expire or can be explicitly cleared.
      // We don't commit if an error occurred to maintain integrity.
      throw e;
    }
  }

  static async db(shardId: string = "main") {
    if (!this.isInitialized) await this.init();
    return getDb(shardId);
  }

  static async getQueue(): Promise<SqliteQueue<DietCodeJob>> {
    if (!this.isInitialized) await this.init();
    return this.queue!;
  }

  static async flush() {
    if (this.isInitialized) {
      await this.pool.flush();
    }
  }
}
