/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Distributed Task Proxy — Promise-based remote execution
 * 
 * Enqueues tasks to broccoliq and waits for results in job_results.
 */

import * as crypto from 'crypto';
import { SovereignDb } from '../database/SovereignDb';
import type { QueueProvider, JobDefinition } from '../../domain/system/QueueProvider';
import type { LogService } from '../../domain/logging/LogService';

export interface TaskResult<T> {
    success: boolean;
    payload?: T;
    error?: string;
    shardId: number;
}

export class SovereignWorkerProxy {
    constructor(
        private queue: QueueProvider,
        private logService: LogService
    ) {}

    /**
     * Executes a sharded task remotely and waits for all shards to complete.
     */
    async executeDistributed<TReq, TRes>(
        type: string,
        shards: TReq[],
        options: { timeoutMs?: number; pollIntervalMs?: number } = {}
    ): Promise<TaskResult<TRes>[]> {
        const taskId = crypto.randomUUID();
        const timeout = options.timeoutMs || 60000;
        const pollInterval = options.pollIntervalMs || 500;
        const startTime = Date.now();

        this.logService.info(
            `Dispatching distributed task`,
            { taskId, type, shardCount: shards.length },
            { component: 'SovereignWorkerProxy' }
        );

        // 1. Enqueue all shards
        for (let i = 0; i < shards.length; i++) {
            await this.queue.enqueue({
                type: type as any,
                payload: {
                    taskId,
                    shardId: i,
                    payload: shards[i]
                }
            });
        }

        // 2. Poll for results
        const results: TaskResult<TRes>[] = [];
        const seenShards = new Set<number>();

        while (results.length < shards.length && (Date.now() - startTime) < timeout) {
            const db = await SovereignDb.db();
            const dbResults = await db.selectFrom('job_results' as any)
                .selectAll()
                .where('taskId', '=', taskId)
                .execute();

            for (const r of dbResults as any[]) {
                if (!seenShards.has(r.shardId)) {
                    seenShards.add(r.shardId);
                    results.push({
                        success: r.status === 'completed',
                        payload: r.payload ? JSON.parse(r.payload) : undefined,
                        error: r.error,
                        shardId: r.shardId
                    });
                }
            }

            if (results.length < shards.length) {
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            }
        }

        if (results.length < shards.length) {
            this.logService.error(
                `Distributed task timed out`,
                { taskId, receivedCount: results.length, totalCount: shards.length },
                { component: 'SovereignWorkerProxy' }
            );
        }

        return results;
    }
}
