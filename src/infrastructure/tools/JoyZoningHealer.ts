/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Deterministic Self-Healing for JoyZoning Guarding Issues.
 * High-performance response engine for direct architectural remediation.
 */

import * as path from 'node:path';
import {
  ArchitecturalGuardian,
  type ArchitecturalViolation,
} from '../../domain/architecture/ArchitecturalGuardian';
import type { RemediationStep } from './Remediator';

export interface JoyZoningHealPayload {
  path: string; // Current transient home of the file (after bypass)
  violations: ArchitecturalViolation[];
  suggestedPath?: string;
}

export interface DirectAction {
  strategy: 'MOVE_TO_SAFE_ZONE' | 'ALIGN_WITH_CLUSTER' | 'DEEP_REMEDIATION' | 'NO_ACTION';
  step?: RemediationStep;
}

/**
 * JoyZoningHealer: Direct-response architect.
 * Removes scoring/confidence checks to facilitate higher throughput in the background loop.
 */
export class JoyZoningHealer {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Determine the deterministic remediation step for a flagged issue.
   * Logic: Direct mapping of violation type to execution step.
   */
  async determineAction(payload: JoyZoningHealPayload): Promise<DirectAction> {
    const { path: currentPath, violations, suggestedPath } = payload;

    console.log(
      `[JoyZoningHealer] Direct Analysis: ${currentPath} (${violations.length} violations)`,
    );

    const hasDomainLeak = violations.some((v) => v.type === 'DOMAIN_LEAK');
    const isMissingSubzone = violations.some((v) => v.type === 'SUBZONE_MISSING');

    // Deterministic Priority 1: Domain Purity (Leak Repair)
    if (hasDomainLeak && suggestedPath) {
      return {
        strategy: 'MOVE_TO_SAFE_ZONE',
        step: this.buildStep(currentPath, suggestedPath),
      };
    }

    // Deterministic Priority 2: Functional Alignment (Cluster Placement)
    if (isMissingSubzone && suggestedPath) {
      return {
        strategy: 'ALIGN_WITH_CLUSTER',
        step: this.buildStep(currentPath, suggestedPath),
      };
    }

    // Deterministic Priority 3: General Remediation
    if (violations.length > 0) {
      return {
        strategy: 'DEEP_REMEDIATION',
      };
    }

    return { strategy: 'NO_ACTION' };
  }

  private buildStep(currentPath: string, targetPath: string): RemediationStep {
    const filename = path.basename(currentPath);
    const subZone = ArchitecturalGuardian.getCluster(targetPath) || 'unknown';

    return {
      file: filename,
      currentPath: currentPath,
      targetPath: targetPath,
      targetLayer: ArchitecturalGuardian.getLayer(targetPath) || 'UNKNOWN',
      targetSubZone: subZone,
    };
  }
}
