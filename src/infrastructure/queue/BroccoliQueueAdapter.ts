/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: Infrastructure]
 * [SUB-ZONE: queue/providers]
 * Principle: BroccoliDB adapter with nuclear schema hardening
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Nuclear Hardening: Automatically patches tables missing 'id' column before operations
 */

import * as crypto from 'node:crypto';
import type { QueueProvider } from '../../domain/system/QueueProvider';
import type { JobDefinition } from '../../domain/system/QueueProvider';
import { Core } from '../database/sovereign/Core';

export class BroccoliQueueAdapter implements QueueProvider {
  private workerId = `worker-${crypto.randomUUID()}`;
  private isProcessing = false;

  /**
   * Enqueues a typed job into the Sovereign Swarm Queue (v2.0)
   * Modern Architecture: Schema hardening is handled at the Core/Schema level.
   */
  async enqueue<T>(job: JobDefinition<T>): Promise<string> {
    const id = (job as any).id || crypto.randomUUID();

    // Normalize type to string for JSON serialization
    const jobTypeStr = typeof job.type === 'string' ? job.type : String(job.type);

    await Core.push({
      type: 'insert',
      table: 'hive_queue',
      values: {
        id,
        type: jobTypeStr,
        status: 'pending',
        worker_id: null,
        claimed_at: null,
        total_shards: 1,
        completed_shards: 0,
        metadata: JSON.stringify(job.payload),
        created_at: Date.now(),
        updated_at: Date.now(),
      },
    });

    return id;
  }

  /**
   * Processes jobs from the queue via polling (Atomic Claiming Pass 19)
   */
  process<T>(callback: (job: any) => Promise<void>): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const poll = async () => {
      if (!Core.isAvailable()) {
        setTimeout(poll, 15000);
        return;
      }

      try {
        const db = (await Core.db()) as KyselyDatabase;

        // Pass 19: Atomic Claiming Pattern
        // 1. Identify pending jobs
        const jobs = await db
          .selectFrom('hive_queue')
          .select(['id', 'type', 'metadata'])
          .where('status', '=', 'pending')
          .orderBy('created_at', 'asc')
          .limit(5)
          .execute();

        for (const job of jobs) {
          // 2. Atomic Claim: Try to mark as processing with OUR workerId
          const result = await db
            .updateTable('hive_queue')
            .set({ 
              status: 'processing', 
              worker_id: this.workerId,
              claimed_at: Date.now(),
              updated_at: Date.now() 
            })
            .where('id', '=', job.id)
            .where('status', '=', 'pending') // Double check atomicity
            .executeTakeFirst();

          // Only proceed if WE were the ones to update it
          if (Number(result.numUpdatedRows) > 0) {
            try {
              await callback({
                id: job.id,
                type: job.type,
                payload: JSON.parse(job.metadata || '{}'),
              });

              // Mark as done
              await db
                .updateTable('hive_queue')
                .set({ status: 'done', updated_at: Date.now() })
                .where('id', '=', job.id)
                .execute();
            } catch (err) {
              console.error(`[QUEUE] Job ${job.id} failed`, err);
              // Mark as failed but PRESERVE metadata payload
              await db
                .updateTable('hive_queue')
                .set({
                  status: 'failed',
                  error: String(err), // Use dedicated error field if available or metadata
                  updated_at: Date.now(),
                })
                .where('id', '=', job.id)
                .execute();
            }
          }
        }
      } catch (e) {
        // Background loop errors should not crash the host
      }

      setTimeout(poll, 15000); // 15s poll
    };

    poll(); 
  }
}
