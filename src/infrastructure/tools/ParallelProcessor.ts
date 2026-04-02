/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Concurrent Throughput — executes tasks in parallel with a concurrency limit.
 */

export class ParallelProcessor {
  /**
   * Processes an array of items with a concurrency limit
   * 
   * @param items Items to process
   * @param mapper Function to apply to each item
   * @param limit Maximum concurrent executions
   * @returns Array of results
   */
  static async map<T, R>(items: T[], mapper: (item: T) => Promise<R>, limit: number = 10): Promise<R[]> {
    const results: R[] = new Array(items.length);
    const queue = [...items.entries()];
    
    const workers = Array(Math.min(limit, items.length)).fill(null).map(async () => {
      for (const [index, item] of queue) {
        results[index] = await mapper(item);
      }
    });

    await Promise.all(workers);
    return results;
  }
}
