/**
 * [LAYER: INFRASTRUCTURE]
 * [SUB-ZONE: refactor]
 * Principle: Refactor Move Engine — Handles atomic IO operations for relocation.
 */

import * as fs from 'fs';
import { promises as pfs } from 'fs';
import * as path from 'path';

export class RefactorMoveEngine {
  constructor(private projectRoot: string) {}

  /**
   * Execute physical move plus directory management.
   */
  async move(oldPath: string, newPath: string): Promise<void> {
    const absOldPath = path.resolve(this.projectRoot, oldPath);
    const absNewPath = path.resolve(this.projectRoot, newPath);

    if (!fs.existsSync(path.dirname(absNewPath))) {
      fs.mkdirSync(path.dirname(absNewPath), { recursive: true });
    }

    await pfs.rename(absOldPath, absNewPath);
  }
}
