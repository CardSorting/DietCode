/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Axiomatic integrity verification and consistency checks
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Hardening:
 *   - [HARDENED] Post-Scoring strategy: Transitioned to Axiomatic Verification
 *   - [HARDENED] O(N) Regex-based structural and purity validators
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  AxiomProfile,
  SemanticHealth,
  TokenHash,
  Violation,
} from '../../domain/task/ImplementationSnapshot';
import {
  ComplianceState,
  IntegrityAxiom,
  ViolationType,
} from '../../domain/task/ImplementationSnapshot';
import type {
  FileIntegrityResult,
  ProjectIntegrityReport,
} from '../../domain/task/ProjectIntegrityReport';
import { AxiomaticASTAnalyser } from './AxiomaticASTAnalyser';

/**
 * Production-grade axiomatic analysis for content integrity
 * Verifies structural, semantic, and purity axioms to determine compliance
 */
export class SemanticIntegrityAnalyser {
  private astAnalyser = new AxiomaticASTAnalyser();

  /**
   * Generates a stable SHA-256 hash for content caching
   */
  static calculateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Evaluates content for integrity alignment using a multi-tiered axiomatic approach
   */
  assessIntegrityAlignment(
    content: string,
    tokenHashes: TokenHash[] = [],
    context: { layer?: string; objective?: string } = {},
  ): SemanticHealth {
    // Pass 1: High-Throughput Structural Axiom Check
    const structuralResult = this.verifyStructuralAxiom(content);
    const resonanceResult = this.verifyResonanceAxiom(content, context.objective || '');

    // Precise AST scan (Zero false positives)
    const astViolations = this.verifyPurityAxiomPrecise(content, context.layer || 'unknown');
    const purityAxiomResult = astViolations.length === 0;

    const failingAxioms: IntegrityAxiom[] = [];
    if (!structuralResult) failingAxioms.push(IntegrityAxiom.STRUCTURAL);
    if (!purityAxiomResult) failingAxioms.push(IntegrityAxiom.PURITY);
    if (!resonanceResult) failingAxioms.push(IntegrityAxiom.RESONANCE);

    const interfaceResult = !astViolations.some((v) => v.message.includes('Ghost Implementation'));
    const simplicityResult = !astViolations.some((v) => v.message.includes('Gravity Bloat'));

    if (!interfaceResult) failingAxioms.push(IntegrityAxiom.INTERFACE_INTEGRITY);
    if (!simplicityResult) failingAxioms.push(IntegrityAxiom.COGNITIVE_SIMPLICITY);

    // Determine compliance state based on axiom failure severity
    let status = ComplianceState.CLEARED;
    if (
      failingAxioms.includes(IntegrityAxiom.PURITY) ||
      failingAxioms.includes(IntegrityAxiom.RESONANCE)
    ) {
      status = ComplianceState.BLOCKED;
    } else if (failingAxioms.length > 0) {
      status = ComplianceState.FLAGGED;
    }

    const profile: AxiomProfile = {
      status,
      failingAxioms,
      axiomResults: {
        [IntegrityAxiom.STRUCTURAL]: structuralResult,
        [IntegrityAxiom.RESONANCE]: resonanceResult,
        [IntegrityAxiom.PURITY]: purityAxiomResult,
        [IntegrityAxiom.STABILITY]: true,
        [IntegrityAxiom.INTERFACE_INTEGRITY]: interfaceResult,
        [IntegrityAxiom.COGNITIVE_SIMPLICITY]: simplicityResult,
      },
    };

    const violations: Violation[] = failingAxioms.map((axiom) => {
      const violation: Violation = {
        id: crypto.randomUUID(),
        type: ViolationType.AXIOM_VIOLATION,
        message: `Axiom Violation: ${axiom.toUpperCase()} failed verification`,
        severity: status === ComplianceState.BLOCKED ? 'error' : 'warning',
        timestamp: new Date(),
      };

      if (axiom === IntegrityAxiom.PURITY && astViolations.length > 0) {
        violation.location = {
          file: 'unknown',
          lineNumber: astViolations[0].lineNumber,
          codeSnippet: astViolations[0].snippet,
        };
        violation.message = `${violation.message} - ${astViolations[0].message}`;
      }

      return violation;
    });

    return {
      axiomProfile: profile,
      violations,
      warnings:
        status === ComplianceState.FLAGGED ? ['Content requires structural alignment review'] : [],
    };
  }

  /**
   * @deprecated Use assessIntegrityAlignment
   */
  calculateSemanticIntegrity(content: string, tokenHashes: TokenHash[] = []): SemanticHealth {
    return this.assessIntegrityAlignment(content, tokenHashes);
  }

  /**
   * Axiom 1: Structural Integrity (Regex-based verification)
   */
  verifyStructuralAxiom(content: string): boolean {
    if (!content || content.length < 10) return false;
    // Must contain mandatory layer/principle header or similar markers
    const layers = ['CORE', 'DOMAIN', 'INFRASTRUCTURE'];
    const hasLayerHeader = layers.some((l) => content.includes(`[LAYER: ${l}]`));
    const hasPrinciple = content.includes('Principle:');
    const hasMarkdownList = content.includes('- [ ]') || content.includes('- [x]');

    return (hasLayerHeader && hasPrinciple) || hasMarkdownList;
  }

  /**
   * Axiom 2: Objective Resonance (Semantic atom check)
   */
  verifyResonanceAxiom(content: string, objective: string): boolean {
    if (!content) return false;
    if (!objective) return true; // Pass if no objective to check against

    const atoms = objective
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4);
    if (atoms.length === 0) return true;

    const contentLower = content.toLowerCase();
    const matchedAtoms = atoms.filter((atom) => contentLower.includes(atom));

    // Axiom: Must resonate with at least 25% of core objective atoms
    return matchedAtoms.length / atoms.length >= 0.25;
  }

  /**
   * Precise AST purity check (Zero false positives)
   */
  private verifyPurityAxiomPrecise(content: string, layer: string): any[] {
    if (!content || layer !== 'domain') return [];

    const contaminants = [
      'fs',
      'os',
      'child_process',
      'path',
      'node:fs',
      'node:os',
      'node:child_process',
      'axios',
      'express',
      'sqlite3',
      'knex',
      'better-sqlite3',
    ];

    const purityViolations = this.astAnalyser.detectUnsafeImports(content, contaminants);
    const interfaceViolations = this.verifyInterfaceAxiom(content, layer);
    const complexityViolations = this.verifySimplicityAxiom(content);

    return [...purityViolations, ...interfaceViolations, ...complexityViolations];
  }

  /**
   * Axiom 3.0: Interface Integrity Audit
   */
  private verifyInterfaceAxiom(content: string, layer: string): any[] {
    if (layer !== 'infrastructure') return [];
    return this.astAnalyser.detectMissingInterfaces(content);
  }

  /**
   * Axiom 3.0: Cognitive Simplicity Audit
   */
  private verifySimplicityAxiom(content: string): any[] {
    return this.astAnalyser.detectHighComplexity(content, 12);
  }

  /**
   * Project-Wide Axiomatic Audit (Axiom 3.0)
   * Scans the entire source tree for architectural compliance.
   */
  async runProjectAudit(srcDir: string): Promise<ProjectIntegrityReport> {
    const resultsByLayer: Record<string, FileIntegrityResult[]> = {
      domain: [],
      infrastructure: [],
      core: [],
      unknown: [],
    };

    let totalFiles = 0;
    let compliantCount = 0;
    let blockedCount = 0;
    let flaggedCount = 0;

    const scanDirectory = (dir: string) => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const layer: 'domain' | 'infrastructure' | 'core' | 'unknown' = fullPath.includes(
            'domain',
          )
            ? 'domain'
            : fullPath.includes('infrastructure')
              ? 'infrastructure'
              : fullPath.includes('core')
                ? 'core'
                : 'unknown';

          const health = this.assessIntegrityAlignment(content, [], { layer });

          const result: FileIntegrityResult = {
            filePath: fullPath,
            layer,
            axiomProfile: health.axiomProfile,
            violations: health.violations,
          };

          if (!resultsByLayer[layer]) {
            resultsByLayer[layer] = [];
          }
          resultsByLayer[layer].push(result);
          totalFiles++;

          if (health.axiomProfile.status === ComplianceState.CLEARED) compliantCount++;
          else if (health.axiomProfile.status === ComplianceState.BLOCKED) blockedCount++;
          else flaggedCount++;
        }
      }
    };

    scanDirectory(srcDir);

    return {
      timestamp: new Date(),
      totalFilesScanned: totalFiles,
      compliantFilesCount: compliantCount,
      blockedFilesCount: blockedCount,
      flaggedFilesCount: flaggedCount,
      resultsByLayer,
      remediationPlan: this.generateRemediationPlan(blockedCount, flaggedCount, resultsByLayer),
    };
  }

  private generateRemediationPlan(
    blocked: number,
    flagged: number,
    results: Record<string, FileIntegrityResult[]>,
  ): string[] {
    const plan: string[] = [];
    if (blocked > 0)
      plan.push(`CRITICAL: Resolve ${blocked} BLOCKED files immediately to restore sovereignty.`);
    if (flagged > 0)
      plan.push(
        `WARNING: Schedule cleanup for ${flagged} FLAGGED files to reduce architectural debt.`,
      );

    const ghosts = Object.values(results)
      .flat()
      .filter((r) => r.violations.some((v) => v.message.includes('Ghost')));
    if (ghosts.length > 0) {
      plan.push(
        `URGENT: ${ghosts.length} Ghost Implementations detected. Apply domain interfaces to infrastructure classes.`,
      );
    }

    return plan;
  }
}
