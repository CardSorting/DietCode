/**
 * [LAYER: INFRASTRUCTURE]
 * [SUB-ZONE: refactor]
 * Principle: Sovereign Tag Sentinel — Manages header/tagging consistency during relocation.
 * Pass 3 Hardening: Robust Node.js Header Management.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export class RefactorTagSentinel {
  constructor(private projectRoot: string) {}

  /**
   * Update [SUB-ZONE] and [LAYER] headers in a file after move.
   * Hardened to be platform-independent and idempotent.
   */
  async updateTags(newPath: string): Promise<void> {
    const absNewPath = path.resolve(this.projectRoot, newPath);
    if (!fs.existsSync(absNewPath)) return;

    // Extract functional cluster (sub-zone) and layer from path
    const subZoneMatch = newPath.match(/src\/[a-z]+\/([a-z0-9\-_]+)\//i);
    const subZone = subZoneMatch ? subZoneMatch[1] : 'unknown';
    const layer = this.getLayer(newPath);

    let content = fs.readFileSync(absNewPath, 'utf8');

    // Step 1: Align or Inject LAYER Tag
    if (content.includes('[LAYER:')) {
      content = content.replace(/\[LAYER:\s*.*\]/i, `[LAYER: ${layer}]`);
    } else {
      // Inject complete functional header if missing
      content = `/**\n * [LAYER: ${layer}]\n */\n\n${content}`;
    }

    // Step 2: Align or Inject SUB-ZONE Tag
    if (content.includes('[SUB-ZONE:')) {
      content = content.replace(/\[SUB-ZONE:\s*.*\]/i, `[SUB-ZONE: ${subZone}]`);
    } else {
      // Inject immediately after LAYER tag
      content = content.replace(/(\[LAYER:.*\])/i, `$1\n * [SUB-ZONE: ${subZone}]`);
    }

    fs.writeFileSync(absNewPath, content, 'utf8');
  }

  private getLayer(filePath: string): string {
    if (filePath.includes('src/domain')) return 'DOMAIN';
    if (filePath.includes('src/core')) return 'CORE';
    if (filePath.includes('src/infrastructure')) return 'INFRASTRUCTURE';
    if (filePath.includes('src/ui')) return 'UI';
    return 'UNKNOWN';
  }
}
