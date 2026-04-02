/**
 * [LAYER: INFRASTRUCTURE]
 * [SUB-ZONE: refactor]
 * Principle: Refactor Event Factory — Generates type-safe architecture events.
 */

import { type ArchitectureEvent, type ArchitecturalEventType } from '../../../domain/events/ArchitectureEvent';
import { type IntegrityReport } from '../../../domain/memory/Integrity';

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
        timestamp?: string
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
                ...error ? { error: error.message } : {}
            }
        };
    }
}
