/**
 * [LAYER: INFRASTRUCTURE]
 * Concrete implementation of IntegrityScanner using regex-based dependency tracing.
 */

import * as path from 'path';
import type { IntegrityScanner } from '../core/integrity/IntegrityService';
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
      const fullPath = path.join(srcDir, file);
      const content = this.filesystem.readFile(fullPath);
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

      // Rule 5: Naming Conventions
      const fileName = path.basename(file);
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
}
