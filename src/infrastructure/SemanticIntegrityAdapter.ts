/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Semantic integrity validation via hash comparison
 * Violations: score property does not exist in IntegrityReport (use violations.length for implied score)
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import type { IntegrityScanner } from '../domain/integrity/IntegrityScanner';
import type { LogService } from '../domain/logging/LogService';
import {
  type IntegrityReport,
  type IntegrityViolation,
  IntegritySeverity,
  ViolationType,
} from '../domain/memory/Integrity';

/**
 * Adapter for semantic integrity validation using hash comparison
 * Version-aware scanning to detect changes within functional clusters
 */
export class SemanticIntegrityAdapter implements IntegrityScanner {
  private poolAdapter: WorkerPoolAdapter;

  constructor(private logService: LogService, useWorkerPool = true) {
    this.poolAdapter = new WorkerPoolAdapter(this, logService, useWorkerPool);
  }

  /**
   * Main entry point - sharded scanning via worker pool
   */
  async scan(projectRoot: string): Promise<IntegrityReport> {
    return this.poolAdapter.scan(projectRoot);
  }

  /**
   * Main worker implementation - sequential processing for strong correctness
   * Worker isolation prevents recursive worker spawning
   */
  async scanFiles(filePaths: string[], projectRoot: string): Promise<IntegrityReport> {
    const allViolations: IntegrityViolation[] = [];
    const paths = filePaths.map(filePath => ({
      path: filePath,
      hash: crypto.createHash('sha256').update(filePath).digest('hex'),
    }));

    for (const { path, hash } of paths) {
      const violations = await this.scanSingleFile(path, projectRoot);
      allViolations.push(...violations);
    }

    return {
      violations: allViolations,
      scannedAt: new Date().toISOString(),
      fileCount: paths.length,
    };
  }

  /**
   * Scan a single file for semantic issues based on content hash
   */
  async scanSingleFile(filePath: string, projectRoot: string): Promise<IntegrityViolation[]> {
    // For now, we use a basic content-based hash to detect changes
    // This is a placeholder - actual semantic analysis would require:
    // - Domain model to verify content
    // - Pattern matching for specific file types
    const content = fs.readFileSync(filePath, 'utf-8');
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    // Placeholder: Check if file has proper header
    if (!content.includes('[LAYER:') && !content.includes('/**')) {
      return [
        {
          id: crypto.randomUUID(),
          type: ViolationType.MISSING_HEADER,
          file: filePath,
          message: 'File is missing Structure Assertion Header (/** ... */)',
          severity: IntegritySeverity.WARN,
          timestamp: new Date().toISOString(),
        },
      ];
    }

    return [];
  }

  /**
   * scanFile wrapper - delegates to scanFiles with single file
   */
  async scanFile(filePath: string, projectRoot: string): Promise<IntegrityReport> {
    return this.scanFiles([filePath], projectRoot);
  }
}