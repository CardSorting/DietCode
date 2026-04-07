/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * [SUB-ZONE: refactor]
 * Principle: Refactor Move Engine — Handles atomic IO operations for relocation.
 */

import * as fs from 'node:fs';
import { promises as pfs } from 'node:fs';
import * as path from 'node:path';

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
