/**
 * [LAYER: CORE]
 * Principle: Architectural Guard — monitors and enforces layer boundaries.
 * Uses structured logging for production-grade observability.
 */

import * as crypto from 'node:crypto';
import { EventType } from '../../domain/Event';
import type { IntegrityScanner } from '../../domain/integrity/IntegrityScanner';
import type { LogService } from '../../domain/logging/LogService';
import type {
  IntegrityReport,
  IntegrityViolation,
  ViolationType,
} from '../../domain/memory/Integrity';
import { RiskLevel } from '../../domain/validation/RiskLevel';
import { Core } from '../../infrastructure/database/sovereign/Core';
import { SafetyGuard } from '../capabilities/SafetyGuard';
import { EventBus } from '../orchestration/EventBus';
import type { HealingService } from './HealingService';

export class IntegrityService implements IntegrityScanner {
  private eventBus: EventBus = EventBus.getInstance();

  constructor(
    private scanner?: IntegrityScanner,
    private healingService?: HealingService,
    private logService?: LogService,
  ) {}

  async scan(projectRoot: string): Promise<IntegrityReport> {
    if (!this.scanner) {
      return {
        violations: [],
        scannedAt: new Date().toISOString(),
        fileCount: 0,
        renderCount: 0,
      };
    }

    const report = await this.scanner.scan(projectRoot);
    await this.reportViolations(report);

    // Phase 2: Critical - Replace silent error swallowing with proper logging
    try {
      await this.recordHistory(report);
    } catch (historyError) {
      const errorMessage =
        historyError instanceof Error ? historyError.message : 'Unknown history recording error';
      if (this.logService) {
        this.logService.error(
          'Failed to record integrity scan history',
          { error: errorMessage, report },
          { component: 'IntegrityService' },
        );
      }
    }

    return report;
  }

  async scanFile(filePath: string, projectRoot: string): Promise<IntegrityReport> {
    if (!this.scanner) return { violations: [], scannedAt: new Date().toISOString() };
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

    await this.reportViolations(report);
    return report;
  }

  /**
   * Pass 7: Throughput-optimized reporter for background worker scans.
   */
  public reportViolationsThroughput(report: IntegrityReport): void {
    this.reportViolations(report);
  }

  private async reportViolations(report: IntegrityReport): Promise<void> {
    if (report.violations.length > 0) {
      if (this.logService) {
        this.logService.warn(
          `Found ${report.violations.length} architectural violations`,
          { violationCount: report.violations.length },
          { component: 'IntegrityService' },
        );
      }

      // Pass 4: Trigger Architectural Alarm if errors (not warnings) found
      const hasErrors = report.violations.some((v) => v.severity === 'error');
      if (hasErrors) {
        SafetyGuard.triggerAlarm();
      }

      for (const violation of report.violations) {
        this.eventBus.emit(EventType.ERROR_OCCURRED, {
          source: 'IntegrityService',
          violationType: violation.type,
          file: violation.file,
          message: violation.message,
        });
      }

      // Pass 5: Proactive Healing Integration
      if (this.healingService) {
        try {
          await this.healingService.processViolations(report.violations);
        } catch (healingError) {
          const errorMessage =
            healingError instanceof Error ? healingError.message : 'Unknown healing process error';
          if (this.logService) {
            this.logService.error(
              'Failed to process integrity violations',
              { error: errorMessage, violationCount: report.violations.length },
              { component: 'IntegrityService' },
            );
          }
        }
      }
    } else {
      // No violations: Clear the alarm
      SafetyGuard.clearAlarm();
    }
  }

  private async recordHistory(report: IntegrityReport): Promise<void> {
    const pool = Core.pool;
    await pool.push({
      type: 'insert',
      table: 'joy_history' as any,
      values: {
        id: crypto.randomUUID(),
        violation_count: report.violations.length,
        file_count: report.fileCount || 0,
        timestamp: Date.now(),
      } as any,
    });
    await pool.flush();
  }
}
