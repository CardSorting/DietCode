/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Distributed Task Proxy — Promise-based remote execution
 *
 * Enqueues tasks to broccoliq and waits for results in job_results.
 */

import * as crypto from 'node:crypto';
import type { LogService } from '../../domain/logging/LogService';
import type { JobDefinition, QueueProvider } from '../../domain/system/QueueProvider';
import { Core } from '../database/sovereign/Core';

export interface TaskResult<T> {
  success: boolean;
  payload?: T;
  error?: string;
  shardId: number;
}

export class SovereignWorkerProxy {
  constructor(
    private queue: QueueProvider,
    private logService: LogService,
  ) {}

  /**
   * Executes a sharded task remotely and waits for all shards to complete.
   */
  async executeDistributed<TReq, TRes>(
    type: string,
    shards: TReq[],
    options: { timeoutMs?: number; pollIntervalMs?: number; priority?: number } = {},
  ): Promise<TaskResult<TRes>[]> {
    const taskId = crypto.randomUUID();
    const timeout = options.timeoutMs || 60000;
    const basePollInterval = options.pollIntervalMs || 500;
    const priority = options.priority || 0;
    const startTime = Date.now();
    let currentPollInterval = 50; // Pass 19: Aggressive start for high-throughput

    this.logService.info(
      'Dispatching distributed task',
      { taskId, type, shardCount: shards.length },
      { component: 'SovereignWorkerProxy' },
    );

    // 1. Enqueue all shards
    for (let i = 0; i < shards.length; i++) {
      await this.queue.enqueue({
        type: type as any,
        payload: {
          taskId,
          shardId: i,
          payload: shards[i],
        },
        priority,
      });
    }

    // 2. Poll for results
    const results: TaskResult<TRes>[] = [];
    const seenShards = new Set<number>();

    while (results.length < shards.length && Date.now() - startTime < timeout) {
      const db = await Core.db();
      const dbResults = await (db as any)
        .selectFrom('job_results' as any)
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
            shardId: r.shardId,
          });
        }
      }

      if (results.length < shards.length) {
        await new Promise((resolve) => setTimeout(resolve, currentPollInterval));
        // Pass 19: Adaptive Backoff
        currentPollInterval = Math.min(basePollInterval, currentPollInterval * 1.5);
      }
    }

    if (results.length < shards.length) {
      this.logService.error(
        'Distributed task timed out',
        { taskId, receivedCount: results.length, totalCount: shards.length },
        { component: 'SovereignWorkerProxy' },
      );
    }

    return results;
  }

  /**
   * Executes a single task remotely and waits for completion.
   */
  async executeSingle<TReq, TRes>(
    type: string,
    payload: TReq,
    options: { timeoutMs?: number; pollIntervalMs?: number; priority?: number } = {},
  ): Promise<TaskResult<TRes>> {
    const taskId = crypto.randomUUID();
    const timeout = options.timeoutMs || 30000;
    const basePollInterval = options.pollIntervalMs || 250;
    const priority = options.priority || 0;
    const startTime = Date.now();
    let currentPollInterval = 50; // Pass 19: Aggressive start for high-throughput

    this.logService.info(
      'Dispatching single background task',
      { taskId, type },
      { component: 'SovereignWorkerProxy' },
    );

    // 1. Enqueue task
    await this.queue.enqueue({
      type: type as any,
      payload: {
        taskId,
        shardId: 0,
        payload,
      },
      priority,
    });

    // 2. Poll for result
    while (Date.now() - startTime < timeout) {
      const db = await Core.db();
      const result = await (db as any)
        .selectFrom('job_results' as any)
        .selectAll()
        .where('taskId', '=', taskId)
        .executeTakeFirst();

      if (result) {
        const r = result as any;
        return {
          success: r.status === 'completed',
          payload: r.payload ? JSON.parse(r.payload) : undefined,
          error: r.error,
          shardId: 0,
        };
      }

      await new Promise((resolve) => setTimeout(resolve, currentPollInterval));
      // Pass 19: Adaptive Backoff
      currentPollInterval = Math.min(basePollInterval, currentPollInterval * 1.5);
    }

    const error = `Background task timed out after ${timeout}ms`;
    this.logService.error(error, { taskId, type }, { component: 'SovereignWorkerProxy' });

    return {
      success: false,
      error,
      shardId: 0,
    };
  }
}
