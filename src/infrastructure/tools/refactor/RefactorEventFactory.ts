/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * [SUB-ZONE: refactor]
 * Principle: Refactor Event Factory — Generates type-safe architecture events.
 */

import type {
  ArchitecturalEventType,
  ArchitectureEvent,
} from '../../../domain/events/ArchitectureEvent';
import type { IntegrityReport } from '../../../domain/memory/Integrity';

export class RefactorEventFactory {
  constructor(private projectRoot: string) {}

  /**
   * Create architecture event with metadata enrichment.
   */
  createEvent(
    type: ArchitecturalEventType,
    oldPath: string,
    newPath: string,
    integrityReport: IntegrityReport,
    error?: Error,
    timestamp?: string,
  ): ArchitectureEvent {
    return {
      type,
      timestamp: timestamp || new Date().toISOString(),
      oldPath,
      newPath,
      oldArchScore: integrityReport.score,
      newArchScore: integrityReport.score, // Simple for now
      scoreChange: 0,
      violations: integrityReport.violations,
      metadata: {
        origin: 'RefactorTools',
        projectRoot: this.projectRoot,
        ...(error ? { error: error.message } : {}),
      },
    };
  }
}
