/**
 * [LAYER: CORE]
 * Principle: Sovereign Healing — a proactive recovery engine for architectural drift.
 * Orchestration: Identifies violations and generates strategic remediation proposals.
 */

import { HealingStatus, type HealingProposal } from '../../domain/healing/Healing';
import type { HealingRepository } from '../../domain/healing/HealingRepository';
import { type IntegrityViolation, ViolationType } from '../../domain/memory/Integrity';
import { SqliteJoyCacheRepository } from '../../infrastructure/database/SqliteJoyCacheRepository';
import * as crypto from 'crypto';
import * as path from 'path';

export class HealingService {
  constructor(
    private repository: HealingRepository,
    private joyCache: SqliteJoyCacheRepository
  ) {}

  /**
   * Processes a list of violations and generates strategic healing proposals.
   */
  async processViolations(violations: IntegrityViolation[]): Promise<HealingProposal[]> {
    const proposals: HealingProposal[] = [];

    for (const violation of violations) {
        const proposal = await this.proposeSolution(violation);
        if (proposal) {
            await this.repository.saveProposal(proposal);
            proposals.push(proposal);
        }
    }

    if (proposals.length > 0) {
        console.log(`🩹  [HealingService] Generated ${proposals.length} remediation proposals.`);
    }

    return proposals;
  }

  /**
   * Pass 11: Proactive Architectural Analysis 
   * Analyzes a file's coupling metrics and generates decoupling suggestions.
   */
  async analyzeStructuralHealth(filePath: string): Promise<HealingProposal | null> {
      const metrics = await this.joyCache.getMetrics(filePath);
      
      // Heuristic: If a file has high Afferent coupling (Ca > 10), it's an anchor.
      // If it's in Infrastructure, it should probably be an interface in Domain.
      if (metrics.afferent > 10 && filePath.includes('src/infrastructure')) {
          return {
              id: crypto.randomUUID(),
              violationId: 'PROACTIVE_COUPLING',
              violation: {
                  id: 'PROACTIVE',
                  file: filePath,
                  type: ViolationType.LAYER_VIOLATION,
                  message: `High Coupling Warning: This file is a bottleneck (Ca=${metrics.afferent}).`,
                  severity: 'warn',
                  timestamp: new Date().toISOString()
              },
              rationale: `Proactive Architecture: This infrastructure component is used by ${metrics.afferent} other files. To improve testability and reduce fragility, consider extracting a Domain interface and using Dependency Injection.`,
              proposedCode: `// RECOMMENDATION: Extract interface to src/domain and implement in ${path.basename(filePath)}.`,
              status: HealingStatus.PENDING,
              createdAt: new Date().toISOString()
          };
      }
      return null;
  }

  private async proposeSolution(violation: IntegrityViolation): Promise<HealingProposal | null> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    switch (violation.type) {
      case ViolationType.MISSING_TAG:
        return {
          id,
          violationId: violation.id,
          violation,
          rationale: `The file ${violation.file} is missing its [LAYER] tag. Based on its location, it should be tagged as [LAYER: ${this.guessLayer(violation.file)}].`,
          proposedCode: `/**\n * [LAYER: ${this.guessLayer(violation.file)}]\n */\n`,
          status: HealingStatus.PENDING,
          createdAt
        };

      case ViolationType.MISPLACED_FILE:
        const targetDir = this.getTargetDir(violation.message);
        return {
          id,
          violationId: violation.id,
          violation,
          rationale: `Architectural alignment: Relocating ${violation.file} to its declared boundary (${targetDir}).`,
          proposedCode: `RefactorTools.moveAndFixImports("${violation.file}", "${path.join(targetDir, path.basename(violation.file))}")`,
          status: HealingStatus.PENDING,
          createdAt
        };

      case ViolationType.LAYER_VIOLATION:
        return {
          id,
          violationId: violation.id,
          violation,
          rationale: `CRITICAL Boundary Violation: A high-level component is importing a low-level implementation. This requires manual decoupling or an abstraction layer in the Domain.`,
          proposedCode: `// RECOMMENDATION: Introduce an interface in the Domain layer for this infrastructure dependency.`,
          status: HealingStatus.PENDING,
          createdAt
        };

      default:
        return null;
    }
  }

  private guessLayer(filePath: string): string {
    if (filePath.includes('src/domain')) return 'DOMAIN';
    if (filePath.includes('src/core')) return 'CORE';
    if (filePath.includes('src/infrastructure')) return 'INFRASTRUCTURE';
    if (filePath.includes('src/ui')) return 'UI';
    return 'UTILS';
  }

  private getTargetDir(message: string): string {
    if (message.includes('src/domain')) return 'src/domain';
    if (message.includes('src/core')) return 'src/core';
    if (message.includes('src/infrastructure')) return 'src/infrastructure';
    if (message.includes('src/ui')) return 'src/ui';
    return 'src/utils';
  }
}
