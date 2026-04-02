/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of Domain QueueProvider using BroccoliDB
 */

import { SovereignDb } from '../database/SovereignDb';
import type { QueueProvider } from '../../domain/system/QueueProvider';
import type { JobDefinition } from '../../domain/system/QueueProvider';

export class BroccoliQueueAdapter implements QueueProvider {
  /**
   * Enqueues a typed job into the Sovereign Swarm Queue
   */
  async enqueue<T>(job: JobDefinition<T>): Promise<string> {
    const queue = await SovereignDb.getQueue();
    
    // Normalize type to string for JSON serialization
    const jobTypeStr = typeof job.type === 'string' ? job.type : String(job.type);
    
    // Create a properly typed object for the queue
    const dietCodeJob: { type: string; payload: T } = {
      type: jobTypeStr,
      payload: job.payload
    };

    // Cast to match DietCodeJob interface expected by queue.enqueue
    return queue.enqueue(dietCodeJob as any);
  }
}