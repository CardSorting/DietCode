/**
 * [LAYER: CORE]
 * Principle: Architectural Guard — monitors and enforces layer boundaries.
 */

import { EventBus } from './EventBus';
import { EventType } from '../domain/Event';
import type { IntegrityViolation, IntegrityReport, ViolationType } from '../domain/memory/Integrity';

export interface IntegrityScanner {
  scan(projectRoot: string): Promise<IntegrityReport>;
}

export class IntegrityService {
  private eventBus: EventBus = EventBus.getInstance();

  constructor(private scanner: IntegrityScanner) {}

  /**
   * Performs an architectural integrity scan across the codebase.
   */
  async check(projectRoot: string): Promise<IntegrityReport> {
    const report = await this.scanner.scan(projectRoot);
    
    if (report.violations.length > 0) {
      console.warn(`[INTEGRITY] Found ${report.violations.length} architectural violations.`);
      for (const violation of report.violations) {
        this.eventBus.emit(EventType.ERROR_OCCURRED, { 
          source: 'IntegrityService',
          violationType: violation.type,
          file: violation.file,
          message: violation.message 
        });
      }
    }
    
    return report;
  }
}
