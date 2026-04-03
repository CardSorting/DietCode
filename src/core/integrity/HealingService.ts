/**
 * [LAYER: CORE]
 * Principle: Sovereign Healing — a proactive recovery engine for architectural drift.
 * Pass 13: Autonomous Self-Healing — implements confidence-based auto-remediation.
 */

import { HealingStatus, type HealingProposal } from '../../domain/healing/Healing';
import type { HealingRepository } from '../../domain/healing/HealingRepository';
import { type IntegrityViolation, ViolationType } from '../../domain/memory/Integrity';
import { SqliteJoyCacheRepository } from '../../infrastructure/database/SqliteJoyCacheRepository';
import { RefactorTools } from '../../infrastructure/tools/RefactorTools';
import { IntegrityScanner } from '../../domain/integrity/IntegrityScanner';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

export class HealingService {
  private refactorTools?: RefactorTools;
  
  constructor(
    private repository: HealingRepository,
    private joyCache: SqliteJoyCacheRepository,
    private projectRoot: string,
    scanner?: IntegrityScanner
  ) {
    if (scanner) {
      this.refactorTools = new RefactorTools(scanner);
    }
  }

  async processViolations(violations: IntegrityViolation[]): Promise<HealingProposal[]> {
    const proposals: HealingProposal[] = [];
    for (const violation of violations) {
        const proposal = await this.proposeSolution(violation);
        if (proposal) {
            await this.repository.saveProposal(proposal);
            proposals.push(proposal);
        }
    }
    return proposals;
  }

  async analyzeStructuralHealth(filePath: string): Promise<HealingProposal | null> {
      const metrics = await this.joyCache.getMetrics(filePath);
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
              confidence: 0.3,
              createdAt: new Date().toISOString()
          };
      }
      return null;
  }

  async applyProposal(id: string): Promise<boolean> {
      const proposal = await this.repository.getProposalById(id);
      if (!proposal || proposal.status !== HealingStatus.PENDING) return false;
      
      try {
          if (!this.refactorTools) return false;
          switch (proposal.violation.type) {
              case ViolationType.MISSING_TAG:
                  const content = fs.readFileSync(path.resolve(this.projectRoot, proposal.violation.file), 'utf8');
                  const newContent = `${proposal.proposedCode}${content}`;
                  fs.writeFileSync(path.resolve(this.projectRoot, proposal.violation.file), newContent);
                  break;
              case ViolationType.MISPLACED_FILE:
                  const targetDir = this.getTargetDir(proposal.violation.message);
                  const targetPath = path.join(targetDir, path.basename(proposal.violation.file));
                  await this.refactorTools.moveAndFixImports(proposal.violation.file, targetPath, { force: false });
                  break;
              default:
                  return false;
          }
          await this.repository.updateProposalStatus(id, HealingStatus.APPLIED);
          return true;
      } catch (error) {
          console.error(`❌ [HealingService] Failed:`, error);
          await this.repository.updateProposalStatus(id, HealingStatus.FAILED);
          return false;
      }
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
          confidence: 1.0,
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
          confidence: 0.8,
          createdAt
        };
      case ViolationType.LAYER_VIOLATION:
        return {
          id,
          violationId: violation.id,
          violation,
          rationale: `CRITICAL Boundary Violation: A high-level component is importing a low-level implementation.`,
          proposedCode: `// RECOMMENDATION: Introduce an interface in the Domain layer.`,
          status: HealingStatus.PENDING,
          confidence: 0.1,
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
    if (filePath.includes('src/plumbing') || filePath.includes('src/utils')) return 'PLUMBING';
    return 'UNKNOWN';
  }

  private getTargetDir(message: string): string {
    if (message.includes('src/domain')) return 'src/domain';
    if (message.includes('src/core')) return 'src/core';
    if (message.includes('src/infrastructure')) return 'src/infrastructure';
    if (message.includes('src/ui')) return 'src/ui';
    if (message.includes('src/plumbing')) return 'src/plumbing';
    return 'src/utils';
  }
}
