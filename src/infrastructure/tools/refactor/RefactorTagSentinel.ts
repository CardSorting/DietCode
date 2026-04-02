/**
 * [LAYER: INFRASTRUCTURE]
 * [SUB-ZONE: refactor]
 * Principle: Sovereign Tag Sentinel — Manages header/tagging consistency during relocation.
 */

import * as fs from 'fs';
import * as path from 'path';

export class RefactorTagSentinel {
    constructor(private projectRoot: string) {}

    /**
     * Update [SUB-ZONE] and [LAYER] headers in a file after move.
     */
    async updateTags(newPath: string): Promise<void> {
        const absNewPath = path.resolve(this.projectRoot, newPath);
        
        // Extract new functional cluster (sub-zone) from path
        const subZoneMatch = newPath.match(/src\/[a-z]+\/([a-z0-9\-_]+)\//i);
        if (!subZoneMatch) return;

        const subZone = subZoneMatch[1];
        let content = fs.readFileSync(absNewPath, 'utf8');

        if (content.includes('[SUB-ZONE:')) {
            content = content.replace(/\[SUB-ZONE:.*\]/i, `[SUB-ZONE: ${subZone}]`);
        } else {
            // Inject after LAYER tag if it exists
            if (content.includes('[LAYER:')) {
                content = content.replace(/(\[LAYER:.*\])/i, `$1\n * [SUB-ZONE: ${subZone}]`);
            }
        }

        fs.writeFileSync(absNewPath, content, 'utf8');
    }
}
