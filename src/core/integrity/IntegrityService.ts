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
import { SafetyGuard } from '../capabilities/SafetyGuard';
import { HealingService } from './HealingService';
import { RiskLevel } from '../../domain/validation/RiskLevel';

export class IntegrityService implements IntegrityScanner {
  private eventBus: EventBus = EventBus.getInstance();

  constructor(
    private scanner?: IntegrityScanner,
    private healingService?: HealingService,
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
    if (!this.scanner) return { score: 100, violations: [], scannedAt: new Date().toISOString() };
    const report = await this.scanner.scanFile(filePath, projectRoot);
    
    // Pass 11: Proactive structural analysis (Coupling/Anchor detection)
    if (this.healingService) {
        const proactiveHeal = await this.healingService.analyzeStructuralHealth(filePath);
        if (proactiveHeal) {
            // If we found a proactive proposal, add it to the report's violations
            // as a 'warn' severity for awareness.
            report.violations.push(proactiveHeal.violation);
            // Direct save to repository (already offloaded to pool)
            await this.healingService.processViolations([proactiveHeal.violation]);
        }
    }

    this.reportViolations(report);
    return report;
  }

  /**
   * Pass 7: Throughput-optimized reporter for background worker scans.
   */
  public reportViolationsThroughput(report: IntegrityReport): void {
      this.reportViolations(report);
  }

  private reportViolations(report: IntegrityReport): void {
    if (report.violations.length > 0) {
      if (this.logService) {
        this.logService.warn(
          `Found ${report.violations.length} architectural violations`,
          { violationCount: report.violations.length },
          { component: 'IntegrityService' }
        );
      }

      // Pass 4: Trigger Architectural Alarm if errors (not warnings) found
      const hasErrors = report.violations.some(v => v.severity === 'error');
      if (hasErrors) {
        SafetyGuard.triggerAlarm();
      }

      for (const violation of report.violations) {
        this.eventBus.emit(EventType.ERROR_OCCURRED, { 
          source: 'IntegrityService',
          violationType: violation.type,
          file: violation.file,
          message: violation.message 
        });
      }

      // Pass 5: Proactive Healing Integration
      if (this.healingService) {
          this.healingService.processViolations(report.violations).catch(() => {});
      }
    } else {
        // No violations: Clear the alarm
        SafetyGuard.clearAlarm();
    }
  }
}