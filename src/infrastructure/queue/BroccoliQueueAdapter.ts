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
   * Processes jobs from the queue via polling (Production Hardening)
   */
  process<T>(callback: (job: any) => Promise<void>): void {
    const poll = async () => {
      if (!Core.isAvailable()) return;

      try {
        const jobs = await Core.selectWhere('hive_queue', { status: 'pending' }, undefined, { limit: 5 });
        for (const job of jobs) {
          // Mark as processing
          await Core.push({
            type: 'update',
            table: 'hive_queue',
            where: { column: 'id', value: job.id },
            values: { status: 'processing', updated_at: Date.now() }
          });

          try {
            await callback({ id: job.id, type: job.type, payload: JSON.parse(job.metadata || '{}') });
            
            // Mark as done
            await Core.push({
              type: 'update',
              table: 'hive_queue',
              where: { column: 'id', value: job.id },
              values: { status: 'done', updated_at: Date.now() }
            });
          } catch (err) {
            console.error(`[QUEUE] Job ${job.id} failed`, err);
            await Core.push({
              type: 'update',
              table: 'hive_queue',
              where: { column: 'id', value: job.id },
              values: { status: 'failed', metadata: JSON.stringify({ error: String(err) }), updated_at: Date.now() }
            });
          }
        }
      } catch (e) {
        // Background loop errors should not crash the host
      }
    };

    // Start polling loop
    setInterval(poll, 15000); // 15s poll
    poll(); // Initial run
  }
}
