/**
 * [LAYER: INFRASTRUCTURE]
 * Concrete implementation of IntegrityScanner using regex-based dependency tracing.
 */

import * as path from 'path';
import type { IntegrityScanner } from '../core/IntegrityService';
import type { IntegrityReport, IntegrityViolation } from '../domain/Integrity';
import { ViolationType } from '../domain/Integrity';
import type { Filesystem } from '../domain/Filesystem';

export class IntegrityAdapter implements IntegrityScanner {
  constructor(private filesystem: Filesystem) {}

  async scan(projectRoot: string): Promise<IntegrityReport> {
    const violations: IntegrityViolation[] = [];
    const srcDir = path.join(projectRoot, 'src');
    const files = this.filesystem.walk(srcDir);

    for (const file of files) {
      const fullPath = path.join(srcDir, file);
      const content = this.filesystem.readFile(fullPath);
      const relPath = path.relative(projectRoot, fullPath);

      // Rule 1: No I/O imports in Domain
      if (relPath.startsWith('src/domain')) {
        if (content.match(/import.*from.*['"](fs|node:fs|path|node:path|http|https)['"]/)) {
          violations.push(this.createViolation(
            ViolationType.UNAUTHORIZED_IO,
            relPath,
            'I/O imports (fs, path, http) are forbidden in the Domain layer.',
            'error'
          ));
        }
      }

      // Rule 2: No Infrastructure imports in UI
      if (relPath.startsWith('src/ui')) {
        if (content.match(/import.*from.*['"](.*infrastructure.*)['"]/)) {
           violations.push(this.createViolation(
             ViolationType.CROSS_LAYER_IMPORT,
             relPath,
             'UI layer cannot import Infrastructure directly. Use Core or Domain.',
             'error'
           ));
        }
      }
      
      // Rule 3: No cross-layer imports in Domain
      if (relPath.startsWith('src/domain')) {
        if (content.match(/import.*from.*['"](.*(core|infrastructure|ui).*)['"]/)) {
           violations.push(this.createViolation(
             ViolationType.CROSS_LAYER_IMPORT,
             relPath,
             'Domain layer cannot depend on Core, Infrastructure, or UI layers.',
             'error'
           ));
        }

        // Rule 4: Domain Purity (no external library imports except essentials)
        if (content.match(/import.*from.*['"](?!(\.|@dietcode\/|node:)).*['"]/)) {
           violations.push(this.createViolation(
             ViolationType.DOMAIN_PURITY,
             relPath,
             'Domain layer should not depend on external libraries.',
             'warn'
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
