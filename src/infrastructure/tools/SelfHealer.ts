/**
 * [LAYER: INFRASTRUCTURE]
 * [SUB-ZONE: tools]
 * Principle: Autonomous Remediation — Project-wide self-healing orchestrator.
 * Pass 18: Zero-Debt Protocol.
 */

import type { IntegrityScanner } from '../../domain/integrity/IntegrityScanner';
import type { IntegrityPolicy } from '../../domain/memory/IntegrityPolicy';
import { SemanticIntegrityAdapter } from '../SemanticIntegrityAdapter';
import { RefactorTools } from './RefactorTools';
import { type RemediationStep, Remediator } from './Remediator';

export interface HealingReport {
  totalFiles: number;
  movedFiles: number;
  failedFiles: number;
  errors: string[];
}

export class SelfHealer {
  private remediator: Remediator;
  private refactorTools: RefactorTools;
  private scanner: IntegrityScanner;

  constructor(projectRoot: string) {
    this.remediator = new Remediator(projectRoot);
    // We use the SemanticIntegrityAdapter for deep scanning
    this.scanner = new SemanticIntegrityAdapter({
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {},
    } as any);
    this.refactorTools = new RefactorTools(this.scanner);
  }

  /**
   * Executes the full remediation plan to achieve zero organizational debt.
   */
  async healProject(
    options: { dryRun?: boolean; onProgress?: (step: RemediationStep) => void } = {},
  ): Promise<HealingReport> {
    const plan = await this.remediator.generatePlan();
    const report: HealingReport = {
      totalFiles: plan.length,
      movedFiles: 0,
      failedFiles: 0,
      errors: [],
    };

    if (options.dryRun) {
      console.log(`[DRY RUN] Plan generated with ${plan.length} steps.`);
      return report;
    }

    for (const step of plan) {
      try {
        options.onProgress?.(step);

        const result = await this.refactorTools.moveAndFixImports(
          step.currentPath,
          step.targetPath,
          { force: true }, // We use force because we trust the remediator plan
        );

        if (result.success) {
          report.movedFiles++;
        } else {
          report.failedFiles++;
          report.errors.push(`Failed to move ${step.currentPath}: ${result.reason}`);
        }
      } catch (err) {
        report.failedFiles++;
        report.errors.push(`Unexpected error moving ${step.currentPath}: ${err}`);
      }
    }

    return report;
  }
}
