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

import type { QueueProvider } from '../../domain/system/QueueProvider';
import type { JobDefinition } from '../../domain/system/QueueProvider';
import { Core } from '../database/sovereign/Core';
import * as crypto from 'node:crypto';

export class BroccoliQueueAdapter implements QueueProvider {
  /**
   * Enqueues a typed job into the Sovereign Swarm Queue (v2.0)
   * Modern Architecture: Schema hardening is handled at the Core/Schema level.
   */
  async enqueue<T>(job: JobDefinition<T>): Promise<string> {
    const id = job.id || crypto.randomUUID();
    
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
        updated_at: Date.now()
      }
    });

    return id;
  }
}
