/**
 * [LAYER: INFRASTRUCTURE]
 * Concrete implementation of IntegrityScanner using regex-based dependency tracing.
 */

import * as path from 'path';
import * as fs from 'fs';
import type { IntegrityScanner } from '../domain/integrity/IntegrityScanner';
import type { IntegrityReport, IntegrityViolation } from '../domain/memory/Integrity';
import { ViolationType } from '../domain/memory/Integrity';
import { IntegrityPolicy } from '../domain/memory/IntegrityPolicy';
import type { Filesystem } from '../domain/system/Filesystem';

export class IntegrityAdapter implements IntegrityScanner {
  private policy: IntegrityPolicy = new IntegrityPolicy();

  constructor(private filesystem: Filesystem) {}

  async scan(projectRoot: string): Promise<IntegrityReport> {
    const violations: IntegrityViolation[] = [];
    const srcDir = path.join(projectRoot, 'src');
    const files = this.filesystem.walk(srcDir);

    for (const file of files) {
      const fullPath = path.join(srcDir, file.path);
      
      // OPTIMIZATION: Read only the header (first 16KB) to improve performance
      // This is sufficient for [LAYER] tags and top-level imports
      const content = this.readHeader(fullPath); 
      const relPath = path.relative(projectRoot, fullPath);

      // Consume Domain-level IntegrityPolicy
      const rules = this.policy.getRulesForPath(relPath);
      for (const rule of rules) {
        if (content.match(rule.pattern)) {
          violations.push(this.createViolation(
            rule.type,
            relPath,
            rule.message,
            rule.severity
          ));
        }
      }
 
      // Rule: Misplaced File Detection (Strict Header Search)
      // Only match [LAYER] if it appears in the first 500 characters
      const layerMatch = content.slice(0, 500).match(/\[LAYER:?\s*([A-Z]+)\]/);
      if (layerMatch && layerMatch[1]) {
          const declaredLayer = layerMatch[1];
          const expectedDir = this.getExpectedDir(declaredLayer);
          if (expectedDir && !relPath.startsWith(expectedDir)) {
              violations.push(this.createViolation(
                  ViolationType.MISPLACED_FILE,
                  relPath,
                  `File declares [LAYER: ${declaredLayer}] but is located in ${relPath}. Should be in ${expectedDir}.`,
                  'error'
              ));
          }
      }

      // Rule 5: Naming Conventions
      const fileName = path.basename(fullPath);
      if (relPath.includes('/core/') && fileName.match(/[A-Z].*\.ts$/) && !fileName.match(/(Service|Manager|Processor|Loader|Resolver|Bus|Registry|Pruner|Ignorer|Adapter)\.ts$/)) {
          violations.push(this.createViolation(
            ViolationType.NAMING_CONVENTION,
            relPath,
            'Core components should follow naming conventions (e.g., Service, Manager).',
            'warn'
          ));
      }
      
      if (relPath.includes('/infrastructure/database/') && fileName.match(/Sqlite.*\.ts$/) && !fileName.match(/Repository\.ts$/) && !fileName.match(/Db\.ts$/)) {
          violations.push(this.createViolation(
            ViolationType.NAMING_CONVENTION,
            relPath,
            'Database infrastructure should follow Repository naming convention.',
            'warn'
          ));
      }
    }

    const score = Math.max(0, 100 - (violations.length * 5));

    return {
      score,
      violations,
      scannedAt: new Date().toISOString(),
    };
  }

  async scanFile(filePath: string, projectRoot: string): Promise<IntegrityReport> {
    const violations: IntegrityViolation[] = [];
    const fullPath = path.resolve(projectRoot, filePath);
    const relPath = path.relative(projectRoot, fullPath);

    if (!this.filesystem.exists(fullPath)) {
        return { score: 100, violations: [], scannedAt: new Date().toISOString() };
    }

    const content = this.readHeader(fullPath);
    const rules = this.policy.getRulesForPath(relPath);

    for (const rule of rules) {
      if (content.match(rule.pattern)) {
        violations.push(this.createViolation(
          rule.type,
          relPath,
          rule.message,
          rule.severity
        ));
      }
    }

    // Misplaced File Detection
    const layerMatch = content.slice(0, 500).match(/\[LAYER:?\s*([A-Z]+)\]/);
    if (layerMatch && layerMatch[1]) {
        const declaredLayer = layerMatch[1];
        const expectedDir = this.getExpectedDir(declaredLayer);
        if (expectedDir && !relPath.startsWith(expectedDir)) {
            violations.push(this.createViolation(
                ViolationType.MISPLACED_FILE,
                relPath,
                `File declares [LAYER: ${declaredLayer}] but is located in ${relPath}. Should be in ${expectedDir}.`,
                'error'
            ));
        }
    }

    return {
        score: Math.max(0, 100 - (violations.length * 5)),
        violations,
        scannedAt: new Date().toISOString()
    };
  }

  private createViolation(type: ViolationType, file: string, message: string, severity: 'warn' | 'error'): IntegrityViolation {
    return {
      id: crypto.randomUUID(),
      type,
      file,
      message,
      severity,
      timestamp: new Date().toISOString(),
    };
  }

  private getExpectedDir(layer: string): string | null {
      switch (layer) {
          case 'DOMAIN': return 'src/domain';
          case 'CORE': return 'src/core';
          case 'INFRASTRUCTURE': return 'src/infrastructure';
          case 'UI': return 'src/ui';
          case 'PLUMBING':
          case 'UTILS': return 'src/utils';
          default: return null;
      }
  }

  private readHeader(filePath: string): string {
    try {
        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(16384); // 16KB chunk
        const bytesRead = fs.readSync(fd, buffer, 0, 16384, 0);
        fs.closeSync(fd);
        return buffer.toString('utf8', 0, bytesRead);
    } catch (e) {
        // Fallback to full read if chunked read fails (e.g. very small files)
        return this.filesystem.readFile(filePath);
    }
  }
}
