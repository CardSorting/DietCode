import * as path from 'node:path';
import * as fs from 'node:fs';
import { setDbPath, getDb, dbPool, SqliteQueue } from '@noorm/broccoliq';

export type DietCodeJob = {
    type: 'audit' | 'integrity' | 'persist';
    taskId: string;
    payload: any;
};

export class Core {
  private static isInitialized = false;
  private static initializationPromise: Promise<void> | null = null;
  public static pool: typeof dbPool = dbPool;
  private static queue: SqliteQueue<DietCodeJob> | null = null;

  /**
   * Checks if the Sovereign Hive has been successfully initialized.
   */
  public static isAvailable(): boolean {
    return this.isInitialized;
  }

  /**
   * Core initialization hook — established the Sovereign Hive.
   */
  static async init(dbPath?: string, ensureSchemaFn?: (db: any) => Promise<void>) {
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
        const resolvedPath = dbPath || path.resolve(process.cwd(), 'data', 'sovereign.db');
        const dataDir = path.dirname(resolvedPath);
        
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }

        console.log(`[CORE] Initializing Sovereign Hive at: ${resolvedPath}`);
        
        // BroccoliQ v2: Top-level path registration
        setDbPath(resolvedPath);
        
        if (ensureSchemaFn) {
            const db = await dbPool.getDb('main');
            await ensureSchemaFn(db);
        }
        
        this.isInitialized = true;
        console.log(`[CORE] Sovereign Hive initialized (v2.0 Architecture)`);
    })();

    return this.initializationPromise;
  }

  /**
   * Access the main Sovereign database instance.
   */
  static async db() {
    if (!this.isInitialized && !this.initializationPromise) {
      await this.init();
    } else if (this.initializationPromise) {
      await this.initializationPromise;
    }
    return dbPool.getDb('main');
  }

  /**
   * Push a high-velocity data operation to the Sovereign Hive.
   */
  static async push(op: any) {
    if (!this.isInitialized) {
        await this.init();
    }
    return dbPool.push(op);
  }

  /**
   * Fluid select operation from the Sovereign Hive.
   */
  static async selectWhere(table: string, where: any, options: any = {}) {
    if (!this.isInitialized) {
        await this.init();
    }
    return dbPool.selectWhere(table as any, where, undefined, options);
  }

  /**
   * Lifecycle management: Shadow execution for atomic persistence.
   */
  static async runInShadow<T>(agentId: string, fn: () => Promise<T>): Promise<T> {
    if (!this.isInitialized) await this.init();
    
    // BroccoliQ v2: Manual shadow lifecycle
    await dbPool.beginWork(agentId);
    try {
        const result = await fn();
        await dbPool.commitWork(agentId);
        return result;
    } catch (err) {
        // Rollback is implicit in Zero-Shim by not committing
        throw err;
    }
  }

  /**
   * Access a specific database shard.
   */
  static async getShard(shardId: string) {
    if (!this.isInitialized) await this.init();
    return dbPool.getDb(shardId);
  }

  /**
   * Access the Sovereign Job Queue.
   */
  static async getQueue(): Promise<SqliteQueue<DietCodeJob>> {
    if (!this.queue) {
        this.queue = new SqliteQueue<DietCodeJob>({ table: 'hive_queue' } as any);
    }
    return this.queue;
  }

  /**
   * Graceful shutdown of the Sovereign Hive.
   */
  static async flush() {
    if (this.isInitialized) {
        await dbPool.stop();
    }
  }
}
