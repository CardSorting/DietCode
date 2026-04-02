/**
 * [LAYER: INFRASTRUCTURE]
 * [SUB-ZONE: tools]
 * Principle: Structural Remediation — Autonomous refactoring paths to Zero-Debt.
 * Pass 18: Zero-Debt Protocol.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ArchitecturalGuardian } from '../../domain/architecture/ArchitecturalGuardian';

export interface RemediationStep {
    file: string;
    currentPath: string;
    targetPath: string;
    mvCommand: string;
    sedHeaderUpdate: string;
}

export class Remediator {
    private projectRoot: string;

    constructor(projectRoot: string) {
        this.projectRoot = projectRoot;
    }

    /**
     * Generate a full remediation plan for orphaned files in the project.
     */
    async generatePlan(layerPaths: string[] = ['src/domain', 'src/infrastructure', 'src/core', 'src/ui']): Promise<RemediationStep[]> {
        const steps: RemediationStep[] = [];
        const files = this.getAllOrphans(layerPaths);

        for (const file of files) {
            const relPath = path.relative(this.projectRoot, file);
            const target = (ArchitecturalGuardian as any).getSuggestedCluster(relPath);

            if (target) {
                const subZoneMatch = target.match(/src\/[a-z]+\/([a-z0-9\-_]+)\//i);
                const subZone = subZoneMatch ? subZoneMatch[1] : 'unknown';

                steps.push({
                    file: path.basename(file),
                    currentPath: relPath,
                    targetPath: target,
                    mvCommand: `mkdir -p ${path.dirname(target)} && mv ${relPath} ${target}`,
                    sedHeaderUpdate: `sed -i '' 's/\\[LAYER:.*\\]/\\[LAYER: ${this.getLayer(relPath)}\\]\\n * \\[SUB-ZONE: ${subZone}\\]/' ${target}`
                });
            }
        }

        return steps;
    }

    private getAllOrphans(layerPaths: string[]): string[] {
        const orphans: string[] = [];
        
        for (const layerPath of layerPaths) {
            const absLayerPath = path.resolve(this.projectRoot, layerPath);
            if (!fs.existsSync(absLayerPath)) continue;

            const items = fs.readdirSync(absLayerPath);
            for (const item of items) {
                const fullPath = path.join(absLayerPath, item);
                if (fs.statSync(fullPath).isFile() && item.endsWith('.ts') && item !== 'index.ts' && item !== 'types.ts') {
                    orphans.push(fullPath);
                }
            }
        }

        return orphans;
    }

    private getLayer(filePath: string): string {
        if (filePath.includes('src/domain')) return 'DOMAIN';
        if (filePath.includes('src/core')) return 'CORE';
        if (filePath.includes('src/infrastructure')) return 'INFRASTRUCTURE';
        if (filePath.includes('src/ui')) return 'UI';
        return 'UNKNOWN';
    }
}
