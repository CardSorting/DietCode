/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * [SUB-ZONE: tools]
 * Principle: Structural Remediation — Autonomous refactoring paths to Zero-Debt.
 * Pass 18: Zero-Debt Protocol.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ArchitecturalGuardian } from '../../domain/architecture/ArchitecturalGuardian';

export interface RemediationStep {
  file: string;
  currentPath: string;
  targetPath: string;
  targetLayer: string;
  targetSubZone: string;
}

export class Remediator {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Generate a full remediation plan for orphaned files in the project.
   */
  async generatePlan(
    layerPaths: string[] = ['src/domain', 'src/infrastructure', 'src/core', 'src/ui'],
  ): Promise<RemediationStep[]> {
    const steps: RemediationStep[] = [];
    const files = this.getAllOrphans(layerPaths);

    for (const file of files) {
      const relPath = path.relative(this.projectRoot, file);
      const target = ArchitecturalGuardian.getSuggestedCluster(relPath);

      if (target) {
        const subZone = ArchitecturalGuardian.getCluster(target) || 'unknown';

        steps.push({
          file: path.basename(file),
          currentPath: relPath,
          targetPath: target,
          targetLayer: ArchitecturalGuardian.getLayer(target) || 'UNKNOWN',
          targetSubZone: subZone,
        });
      }
    }

    return steps;
  }

  private getAllOrphans(layerPaths: string[]): string[] {
    const orphans: string[] = [];

    for (const layerPath of layerPaths) {
      const absLayerPath = path.resolve(this.projectRoot, layerPath);
      if (!fs.existsSync(absLayerPath)) continue;

      const items = fs.readdirSync(absLayerPath);
      for (const item of items) {
        const fullPath = path.join(absLayerPath, item);
        if (
          fs.statSync(fullPath).isFile() &&
          item.endsWith('.ts') &&
          item !== 'index.ts' &&
          item !== 'types.ts'
        ) {
          orphans.push(fullPath);
        }
      }
    }

    return orphans;
  }
}
