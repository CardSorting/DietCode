/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Worker Thread — offloads CPU-intensive AST analysis to a background thread.
 * Pass 7: Zero-Stalling Architectural Guard.
 */

import { parentPort, workerData } from 'node:worker_threads';
import { IntegrityPolicy } from '../../domain/memory/IntegrityPolicy';
import { analyzeDependencies } from '../SemanticIntegrityAdapter';

if (!parentPort) {
  throw new Error('Worker must be spawned with a parentPort');
}

/**
 * Worker Listener
 * Expects: { filePath: string, projectRoot: string, type: 'FILE' | 'PROJECT' }
 */
parentPort.on(
  'message',
  async (task: { filePath?: string; projectRoot: string; type: 'FILE' | 'PROJECT' }) => {
    const { filePath, projectRoot, type } = task;
    const policy = new IntegrityPolicy(); // Using default policy in worker for now

    try {
      if (type === 'FILE' && filePath) {
        const result = await analyzeDependencies(filePath, projectRoot, policy);
        parentPort?.postMessage({
          success: true,
          violations: result.violations,
          score: Math.max(0, 100 - result.violations.length * 10),
        });
      } else {
        // Project scan logic (optional: can also be offloaded)
        parentPort?.postMessage({
          success: true,
          message: 'Batch scan requested (not yet sharded in worker)',
        });
      }
    } catch (err: any) {
      parentPort?.postMessage({ success: false, error: err.message });
    }
  },
);
