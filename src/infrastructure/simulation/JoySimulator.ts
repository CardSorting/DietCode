/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Predictive Impact Simulation — dry-run architectural audits.
 * Pass 14 /Modular Refresh: The Joy Simulator.
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IntegrityPolicy } from '../../domain/memory/IntegrityPolicy';
import { analyzeDependencies } from '../SemanticIntegrityAdapter';
import { SqliteJoyCacheRepository } from '../database/SqliteJoyCacheRepository';
import { ArchitecturalImpactAnalyzer } from './ArchitecturalImpactAnalyzer';
import type { SimulationResult } from './SimulationResult';
import { VirtualContentAnalyzer } from './VirtualContentAnalyzer';

export class JoySimulator {
  private virtualAnalyzer = new VirtualContentAnalyzer();
  private impactAnalyzer = new ArchitecturalImpactAnalyzer();
  private joyCache = new SqliteJoyCacheRepository();

  async simulateImpact(
    filePath: string,
    proposedContent: string,
    projectRoot: string,
    policy: IntegrityPolicy,
    virtualFiles?: Map<string, string>,
  ): Promise<SimulationResult> {
    const absPath = filePath.startsWith('/') ? filePath : path.resolve(projectRoot, filePath);

    // 1. Snapshot current metrics (with Hash-based Caching)
    const diskContent = fs.existsSync(absPath) ? fs.readFileSync(absPath, 'utf8') : '';
    const currentHash = crypto.createHash('sha256').update(diskContent).digest('hex');

    let diskViolationCount = await this.joyCache.getCachedViolations(absPath, currentHash);

    if (diskViolationCount === null) {
      const { violations } = await analyzeDependencies(absPath, projectRoot, policy);
      diskViolationCount = violations.length;
      // Background cache update
      await this.joyCache.updateCachedViolations(absPath, diskViolationCount ?? 0, currentHash);
    }

    // 2. Virtual Analysis (Pass 18: Multi-File Shadow Check)
    const { violations: predictedViolations } = await this.virtualAnalyzer.analyze(
      absPath,
      proposedContent,
      projectRoot,
      policy,
      virtualFiles,
    );

    // 3. Impact Assessment (Pass 18: Delta Tuning)
    return this.impactAnalyzer.calculateImpact(predictedViolations.length, diskViolationCount || 0);
  }
}
