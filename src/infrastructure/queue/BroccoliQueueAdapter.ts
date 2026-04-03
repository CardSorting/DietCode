import { Core } from '../database/sovereign/Core';
import type { QueueProvider } from '../../domain/system/QueueProvider';
import type { JobDefinition } from '../../domain/system/QueueProvider';

export class BroccoliQueueAdapter implements QueueProvider {
  /**
   * Enqueues a typed job into the Sovereign Swarm Queue (v2.0)
   */
  async enqueue<T>(job: JobDefinition<T>): Promise<string> {
    const queue = await Core.getQueue();
    
    // Normalize type to string for JSON serialization
    const jobTypeStr = typeof job.type === 'string' ? job.type : String(job.type);
    
    // Create the payload exactly as expected by DietCodeJob
    const payload = {
      type: jobTypeStr,
      payload: job.payload,
    };

    // V2.0: Options are passed as a second argument
    return queue.enqueue(payload as any, {
      priority: job.priority
    });
  }
}