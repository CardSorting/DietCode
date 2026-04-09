/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { dbPool, setDbPath } from '@noorm/broccoliq';
import type { Kysely } from 'kysely';
import { BroccoliQueueAdapter } from '../../queue/BroccoliQueueAdapter';
import type { DatabaseSchema } from './DatabaseSchema';

// Expose the bike-pool for direct access
export const pool = dbPool;

/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Centralized Sovereign Hive Orchestration
 */
export class Core {
  private constructor() {} // Static-only class

  private static Kysely: Kysely<DatabaseSchema> | null = null;
  private static appQueue: BroccoliQueueAdapter | null = null;
  private static isInitialized = false;
  private static currentDbPath: string | null = null;
  private static heartbeatInterval: NodeJS.Timeout | null = null;
  private static currentTaskId: string | null = null;
  private static currentHeartbeatId: string | null = null;

  static async init(dbPath: string, ensureSchemaFn?: (db: any) => Promise<void>) {
    const resolvedPath = path.resolve(dbPath);
    if (Core.isInitialized && Core.currentDbPath === resolvedPath) return;
    try {
      console.log(`[CORE] Initializing Sovereign Hive at: ${resolvedPath}`);
      const dir = path.dirname(resolvedPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      setDbPath(resolvedPath);
      Core.currentDbPath = resolvedPath;

      // Level 10: Establish schema baseline before allowing system scans
      await dbPool.getDb('main');

      Core.appQueue = new BroccoliQueueAdapter();
      Core.isInitialized = true;
      if (ensureSchemaFn) {
        await ensureSchemaFn(dbPool);
      }
      console.log('[CORE] Sovereign Hive initialized (v2.0 Architecture)');
    } catch (error) {
      console.error('[CORE] ❌ Failed to initialize Sovereign Hive:', error);
      Core.isInitialized = false;
      throw error;
    }
  }

  /**
   * API: Check if infrastructure is ready.
   */
  static isAvailable(): boolean {
    return Core.isInitialized;
  }

  /**
   * Get Kysely database instance with our schema type
   */
  static kysely(): Kysely<DatabaseSchema> {
    if (!Core.isInitialized) throw new Error('Core not initialized.');
    if (!Core.Kysely) {
      // Level 2: Late-bound Kysely integration with BroccoliQ Buffered Pool
      throw new Error('Kysely must be initialized asynchronously. Use Core.db() instead.');
    }
    return Core.Kysely;
  }

  static async db(): Promise<Kysely<DatabaseSchema>> {
    if (!Core.isInitialized) throw new Error('Core not initialized.');
    return (await dbPool.getDb('main')) as unknown as Kysely<DatabaseSchema>;
  }

  static get pool() {
    return dbPool;
  }

  static async getQueue() {
    if (!Core.isInitialized) throw new Error('Core not initialized.');
    return Core.appQueue;
  }

  static async push(op: any, agentId?: string, affectedFile?: string) {
    if (!Core.isInitialized) throw new Error('Core not initialized.');
    return await dbPool.push(op, agentId, affectedFile);
  }

  static async selectWhere<T extends keyof any>(
    table: T,
    where: any,
    agentId?: string,
    options?: {
      orderBy?: { column: string; direction: 'asc' | 'desc' };
      limit?: number;
      shardId?: string;
    },
  ) {
    if (!Core.isInitialized) throw new Error('Core not initialized.');
    return await dbPool.selectWhere(table as any, where, agentId, options);
  }

  static startHeartbeat(taskId: string) {
    if (!Core.isInitialized) throw new Error('Core not initialized.');
    Core.currentTaskId = taskId;
    Core.currentHeartbeatId = crypto.randomUUID();
    
    // Pass 19: Resilient Heartbeat Loop
    const runHeartbeat = async () => {
      if (!Core.heartbeatInterval) return; // Stopped
      await Core.recordHeartbeat();
      if (Core.heartbeatInterval) {
        Core.heartbeatInterval = setTimeout(runHeartbeat, 5000);
      }
    };

    if (Core.heartbeatInterval) {
      if (typeof Core.heartbeatInterval === 'object') {
        clearInterval(Core.heartbeatInterval as any);
        clearTimeout(Core.heartbeatInterval as any);
      }
    }
    
    Core.heartbeatInterval = setTimeout(runHeartbeat, 5000) as any;
  }

  static stopHeartbeat() {
    if (Core.heartbeatInterval) {
      clearTimeout(Core.heartbeatInterval as any);
      Core.heartbeatInterval = null;
    }
  }

  private static async recordHeartbeat() {
    if (!Core.currentTaskId || !Core.currentHeartbeatId) return;
    try {
      // Harmonized with 'hive_tasks' table in master unified schema
      await Core.push({
        type: 'upsert',
        table: 'hive_tasks',
        where: { column: 'task_id', value: Core.currentTaskId },
        values: {
          id: Core.currentHeartbeatId,
          task_id: Core.currentTaskId,
          state: 'PROCESSING',
          updated_at: Date.now(),
          vitals_heartbeat: JSON.stringify({
            timestamp: Date.now(),
            status: 'ALIVE',
          }),
          v_token: crypto.randomUUID(),
        },
      });
    } catch (_e) {
      // Silence background heartbeats to avoid blocking if the pool is under pressure
    }
  }

  static async flush() {
    Core.stopHeartbeat();
    if (Core.isInitialized) {
      await dbPool.stop();
      Core.isInitialized = false;
      Core.currentDbPath = null;
    }
  }
}
