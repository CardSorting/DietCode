/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Worker Proxy — the main-thread bridge for background auditing.
 * Pass 7: Distributed Architectural Auditing.
 */

import * as path from 'node:path';
import { Worker } from 'node:worker_threads';
import type { IntegrityScanner } from '../domain/integrity/IntegrityScanner';
import type { LogService } from '../domain/logging/LogService';
import type { IntegrityReport, IntegrityViolation } from '../domain/memory/Integrity';

export class WorkerIntegrityAdapter implements IntegrityScanner {
  private worker: Worker;

  constructor(private logService: LogService) {
    // Resolve worker path (assuming .js after build or using ts-node/register)
    const workerPath = path.resolve(__dirname, './workers/IntegrityWorker.ts');
    this.worker = new Worker(workerPath, {
      execArgv: ['-r', 'ts-node/register'],
    });

    this.logService.info(
      '[Worker] IntegrityWorker initialized (off-thread).',
      {},
      { component: 'WorkerIntegrityAdapter' },
    );
  }

  /**
   * Scans the whole project. (Currently synchronous in worker or sharded).
   */
  async scan(projectRoot: string): Promise<IntegrityReport> {
    return new Promise((resolve, reject) => {
      this.worker.postMessage({ type: 'PROJECT', projectRoot });
      this.worker.once('message', (res) => {
        if (res.success) {
          const violations = res.violations || [];
          resolve({
            score: Math.max(0, 100 - violations.length * 10),
            violations: violations,
            scannedAt: new Date().toISOString(),
          });
        } else reject(new Error(res.error));
      });
    });
  }

  /**
   * Scans a single file in the background thread.
   */
  async scanFile(filePath: string, projectRoot: string): Promise<IntegrityReport> {
    return new Promise((resolve, reject) => {
      this.worker.postMessage({ type: 'FILE', filePath, projectRoot });
      this.worker.once('message', (res) => {
        if (res.success)
          resolve({
            score: res.score,
            violations: res.violations,
            scannedAt: new Date().toISOString(),
          });
        else reject(new Error(res.error));
      });
    });
  }

  /**
   * Terminates the background worker.
   */
  terminate(): void {
    this.worker.terminate();
  }
}
