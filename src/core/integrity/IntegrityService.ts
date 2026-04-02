/**
 * [LAYER: CORE]
 * Principle: Architectural Guard — monitors and enforces layer boundaries.
 * Uses structured logging for production-grade observability.
 */

import { EventBus } from '../orchestration/EventBus';
import { EventType } from '../../domain/Event';
import type { IntegrityViolation, IntegrityReport, ViolationType } from '../../domain/memory/Integrity';
import type { LogService } from '../../domain/logging/LogService';
import { IntegrityScanner } from '../../domain/integrity/IntegrityScanner';

export class IntegrityService implements IntegrityScanner {
  private eventBus: EventBus = EventBus.getInstance();

  constructor(
    private scanner?: IntegrityScanner,
    private logService?: LogService
  ) {}

  async scan(projectRoot: string): Promise<IntegrityReport> {
    if (!this.scanner) {
      return {
        score: 100,
        violations: [],
        scannedAt: new Date().toISOString(),
        fileCount: 0,
        renderCount: 0
      };
    }
    
    const report = await this.scanner.scan(projectRoot);
    this.reportViolations(report);
    
    return report;
  }

  async scanFile(filePath: string, projectRoot: string): Promise<IntegrityReport> {
    if (!this.scanner) {
      return { score: 100, violations: [], scannedAt: new Date().toISOString() };
    }
    
    const report = await this.scanner.scanFile(filePath, projectRoot);
    this.reportViolations(report);
    return report;
  }

  private reportViolations(report: IntegrityReport): void {
    if (report.violations.length > 0 && this.logService) {
      this.logService.warn(
        `Found ${report.violations.length} architectural violations`,
        { violationCount: report.violations.length },
        { component: 'IntegrityService' }
      );
      for (const violation of report.violations) {
        this.eventBus.emit(EventType.ERROR_OCCURRED, { 
          source: 'IntegrityService',
          violationType: violation.type,
          file: violation.file,
          message: violation.message 
        });
      }
    }
  }
}