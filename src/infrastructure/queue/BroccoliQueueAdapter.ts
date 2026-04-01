/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of Domain QueueProvider using BroccoliDB.
 */

import { SovereignDb } from '../database/SovereignDb';
import { JobType, type JobDefinition, type QueueProvider } from '../../domain/system/QueueProvider';

export class BroccoliQueueAdapter implements QueueProvider {
  /**
   * Enqueues a typed job into the Sovereign Swarm Queue.
   */
  async enqueue<T>(job: JobDefinition<T>): Promise<string> {
    const queue = await SovereignDb.getQueue();
    
    // We map Domain JobDefinition to the infrastructure-specific SqliteQueue schema
    const result = await queue.enqueue({
      type: job.type as any,
      payload: job.payload,
    } as any);

    return result.id;
  }
}
