/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * [SUB-ZONE: refactor]
 * Principle: Refactor Healer — Orchestrates import resolution (Sync vs Async).
 */

import { JobType } from '../../../domain/system/QueueProvider';
import { Core } from '../../database/sovereign/Core';
import { ImportFixer } from '../ImportFixer';

export class RefactorHealer {
  private importFixer: ImportFixer;

  constructor(projectRoot: string) {
    this.importFixer = new ImportFixer(projectRoot);
  }

  /**
   * Resolve imports based on healing requirements.
   */
  async resolveImports(
    oldPath: string,
    newPath: string,
    requiresHealing: boolean,
    suggestedCluster?: string,
  ): Promise<boolean> {
    if (requiresHealing) {
      // High-Throughput: Enqueue background healing
      const queue = await Core.getQueue();
      await queue?.enqueue({
        type: JobType.JOY_ZONING_HEAL,
        payload: {
          oldPath,
          newPath,
          suggestedCluster: suggestedCluster || newPath,
        },
      });
      return true; // Enqueued
    }
    // Immediate alignment for safe moves
    await this.importFixer.fixImports(oldPath, newPath);
    return false; // Not enqueued (resolved sync)
  }
}
