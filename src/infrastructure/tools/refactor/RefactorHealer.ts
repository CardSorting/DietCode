/**
 * [LAYER: INFRASTRUCTURE]
 * [SUB-ZONE: refactor]
 * Principle: Refactor Healer — Orchestrates import resolution (Sync vs Async).
 */

import { SovereignDb } from '../../database/SovereignDb';
import { ImportFixer } from '../ImportFixer';
import { JobType } from '../../../domain/system/QueueProvider';

export class RefactorHealer {
    private importFixer: ImportFixer;

    constructor(projectRoot: string) {
        this.importFixer = new ImportFixer(projectRoot);
    }

    /**
     * Resolve imports based on healing requirements.
     */
    async resolveImports(
        oldPath: string, 
        newPath: string, 
        requiresHealing: boolean,
        suggestedCluster?: string
    ): Promise<boolean> {
        if (requiresHealing) {
            // High-Throughput: Enqueue background healing
            const queue = await SovereignDb.getQueue();
            await queue.enqueue({
                type: JobType.JOY_ZONING_HEAL,
                payload: {
                    oldPath,
                    newPath,
                    suggestedCluster: suggestedCluster || newPath
                }
            });
            return true; // Enqueued
        } else {
            // Immediate alignment for safe moves
            await this.importFixer.fixImports(oldPath, newPath);
            return false; // Not enqueued (resolved sync)
        }
    }
}
