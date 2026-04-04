import { setDbPath, dbPool } from '@noorm/broccoliq';
import { Schema } from './Schema';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';

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
        if (this.isInitialized && this.currentDbPath === resolvedPath) return;
        try {
            console.log(`[CORE] Initializing Sovereign Hive at: ${resolvedPath}`);
            const dir = path.dirname(resolvedPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            setDbPath(resolvedPath);
            this.currentDbPath = resolvedPath;
            this.isInitialized = true;
            if (ensureSchemaFn) {
                await ensureSchemaFn(dbPool);
            }
            console.log(`[CORE] Sovereign Hive initialized (v2.0 Architecture)`);
        } catch (error) {
            console.error(`[CORE] ❌ Failed to initialize Sovereign Hive:`, error);
            this.isInitialized = false;
            throw error;
        }
    }

    /**
     * API: Check if infrastructure is ready.
     */
    static isAvailable(): boolean {
        return this.isInitialized;
    }

    static async db() {
        if (!this.isInitialized) throw new Error('Core not initialized.');
        return await dbPool.getDb('main');
    }

    static async push(...args: any[]) {
        if (!this.isInitialized) throw new Error('Core not initialized.');
        return await (dbPool as any).push(...args);
    }

    static async selectWhere(...args: any[]) {
        if (!this.isInitialized) throw new Error('Core not initialized.');
        return await (dbPool as any).selectWhere(...args);
    }

    static startHeartbeat(taskId: string) {
        if (!this.isInitialized) throw new Error('Core not initialized.');
        this.currentTaskId = taskId;
        this.currentHeartbeatId = crypto.randomUUID();
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(async () => await this.recordHeartbeat(), 5000);
    }

    static stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private static async recordHeartbeat() {
        if (!this.currentTaskId || !this.currentHeartbeatId) return;
        try {
            await this.push({
                type: 'upsert',
                table: 'hive_tasks',
                where: { task_id: this.currentTaskId },
                values: {
                    id: this.currentHeartbeatId,
                    task_id: this.currentTaskId,
                    vitals_heartbeat: JSON.stringify({
                        timestamp: Date.now(),
                        status: 'ALIVE'
                    }),
                    updated_at: Date.now(),
                    v_token: crypto.randomUUID()
                }
            });
        } catch (e) {}
    }

    static async flush() {
        this.stopHeartbeat();
        if (this.isInitialized) {
            await dbPool.stop();
            this.isInitialized = false;
            this.currentDbPath = null;
        }
    }
}
