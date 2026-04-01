/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Database adapter for BroccoliDB (@noorm/broccoliq).
 */

import { getDb, setDbPath, BufferedDbPool, SqliteQueue } from '@noorm/broccoliq';
import path from 'node:path';

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

    // This will trigger schema initialization if it doesn't exist
    await getDb('main');
    
    // Initialize the Sovereign Swarm Buffered Pool
    this.pool = new BufferedDbPool();

    // Initialize the Sovereign Queue
    this.queue = new SqliteQueue<DietCodeJob>({
      shardId: 'main',
      visibilityTimeoutMs: 60000,
    });
    
    this.isInitialized = true;
    console.log(`[DATABASE] SovereignDb (Queue Ready) initialized at: ${resolvedPath}`);
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
