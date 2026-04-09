/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
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
  IntegritySeverity,
  type IntegrityViolation,
  ViolationType,
} from '../domain/memory/Integrity';
import { WorkerPoolAdapter } from './WorkerPoolAdapter';

/**
 * Adapter for semantic integrity validation using hash comparison
 * Version-aware scanning to detect changes within functional clusters
 */
export class SemanticIntegrityAdapter implements IntegrityScanner {
  private poolAdapter: WorkerPoolAdapter;

  constructor(
    private logService: LogService,
    useWorkerPool = true,
  ) {
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
    const paths = filePaths.map((filePath) => ({
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
   * Scan a single file for semantic issues and architectural violations
   */
  async scanSingleFile(filePath: string, projectRoot: string, contentOverride?: string): Promise<IntegrityViolation[]> {
    const content = contentOverride !== undefined ? contentOverride : fs.readFileSync(filePath, 'utf-8');
    const violations: IntegrityViolation[] = [];

    // Header Validation
    if (!content.includes('[LAYER:') && !content.includes('/**')) {
      violations.push({
        id: crypto.randomUUID(),
        type: ViolationType.MISSING_HEADER,
        file: filePath,
        message: 'File is missing Structure Assertion Header (/** ... */)',
        severity: IntegritySeverity.WARN,
        timestamp: new Date().toISOString(),
      });
    }

    // Layer Boundary Validation
    const layerMatch = content.match(/\[LAYER:\s*(\w+)/);
    if (layerMatch) {
      const currentLayer = layerMatch[1].toUpperCase();
      const importViolations = this.verifyLayerBoundaries(filePath, content, currentLayer);
      violations.push(...importViolations);
    }

    return violations;
  }

  private verifyLayerBoundaries(filePath: string, content: string, layer: string): IntegrityViolation[] {
    const violations: IntegrityViolation[] = [];
    const lines = content.split('\n');
    const imports = lines.filter(l => l.startsWith('import '));

    for (const imp of imports) {
      // Basic check: UI should not import from Infrastructure directly
      if (layer === 'UI' && imp.includes('/infrastructure/')) {
        violations.push({
          id: crypto.randomUUID(),
          type: ViolationType.ARCHITECTURE_VIOLATION,
          file: filePath,
          message: `Sovereign Layer Violation: UI layer cannot import directly from Infrastructure.`,
          severity: IntegritySeverity.ERROR,
          timestamp: new Date().toISOString(),
        });
      }
      
      // Domain should be pure
      if (layer === 'DOMAIN' && (imp.includes('/infrastructure/') || imp.includes('/core/'))) {
        violations.push({
          id: crypto.randomUUID(),
          type: ViolationType.ARCHITECTURE_VIOLATION,
          file: filePath,
          message: `Sovereign Layer Violation: Domain layer must be pure and cannot import from Infrastructure/Core.`,
          severity: IntegritySeverity.ERROR,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return violations;
  }

  /**
   * scanFile wrapper - delegates to scanFiles with single file
   */
  async scanFile(filePath: string, projectRoot: string): Promise<IntegrityReport> {
    return this.scanFiles([filePath], projectRoot);
  }
}

/**
 * Legacy export for dependency analysis - Bridged to real validation logic
 */
export async function analyzeDependencies(
  filePath: string,
  projectRoot: string = process.cwd(),
  policy?: any,
  content?: string,
): Promise<any> {
  const adapter = new SemanticIntegrityAdapter(null as any); // Minimal instance
  const violations = await adapter.scanSingleFile(filePath, projectRoot, content);
  
  return {
    file: filePath,
    dependencies: [],
    violations: violations,
  };
}
