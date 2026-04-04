import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { dbPool, setDbPath } from '@noorm/broccoliq';
import { Schema } from './Schema';

/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Centralized Sovereign Hive Orchestration
 */
export class Core {
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

  static async db() {
    if (!Core.isInitialized) throw new Error('Core not initialized.');
    return await dbPool.getDb('main');
  }

  static async push(...args: any[]) {
    if (!Core.isInitialized) throw new Error('Core not initialized.');
    return await (dbPool as any).push(...args);
  }

  static async selectWhere(...args: any[]) {
    if (!Core.isInitialized) throw new Error('Core not initialized.');
    return await (dbPool as any).selectWhere(...args);
  }

  static startHeartbeat(taskId: string) {
    if (!Core.isInitialized) throw new Error('Core not initialized.');
    Core.currentTaskId = taskId;
    Core.currentHeartbeatId = crypto.randomUUID();
    if (Core.heartbeatInterval) clearInterval(Core.heartbeatInterval);
    Core.heartbeatInterval = setInterval(async () => await Core.recordHeartbeat(), 5000);
  }

  static stopHeartbeat() {
    if (Core.heartbeatInterval) {
      clearInterval(Core.heartbeatInterval);
      Core.heartbeatInterval = null;
    }
  }

  private static async recordHeartbeat() {
    if (!Core.currentTaskId || !Core.currentHeartbeatId) return;
    try {
      await Core.push({
        type: 'upsert',
        table: 'hive_tasks',
        where: { task_id: Core.currentTaskId },
        values: {
          id: Core.currentHeartbeatId,
          task_id: Core.currentTaskId,
          vitals_heartbeat: JSON.stringify({
            timestamp: Date.now(),
            status: 'ALIVE',
          }),
          updated_at: Date.now(),
          v_token: crypto.randomUUID(),
        },
      });
    } catch (e) {}
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
