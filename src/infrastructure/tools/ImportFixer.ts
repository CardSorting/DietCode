/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * [SUB-ZONE: tools]
 * Principle: Import Resolution — AST-agnostic regex-based relative path repair.
 * Pass 18: Zero-Debt Protocol.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export class ImportFixer {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Fix all relative imports pointing to oldPath, updating them to newPath.
   */
  async fixImports(oldPath: string, newPath: string): Promise<{ updatedFiles: string[] }> {
    const updatedFiles: string[] = [];

    // 1. Get the base name without extension for searching
    const oldBase = oldPath.replace(/\.ts$/, '');
    const oldFileName = path.basename(oldBase);

    // 2. Find all files that might contain the import
    // We search for the filename in the project (greedy but safe)
    let filesToProcess: string[] = [];
    try {
      const grepCmd = `grep -rl "${oldFileName}" ${path.join(this.projectRoot, 'src')}`;
      const output = execSync(grepCmd, { encoding: 'utf8' });
      filesToProcess = output.split('\n').filter((f) => f.trim() !== '' && f.endsWith('.ts'));
    } catch (e) {
      // No matches found
      return { updatedFiles: [] };
    }

    for (const importerAbs of filesToProcess) {
      if (importerAbs === path.resolve(this.projectRoot, newPath)) continue;

      const content = fs.readFileSync(importerAbs, 'utf8');
      const importerDir = path.dirname(importerAbs);

      // 3. Regex to find relative imports
      // Matches: import ... from './oldPath' or require('./oldPath')
      // This is tricky because we need to match the specific relative path

      const lines = content.split('\n');
      let modified = false;

      const newContent = lines
        .map((line) => {
          const importMatch = line.match(/(import|from|require)\s*['"](\.?\.\/.*)['"]/);
          if (importMatch?.[2]) {
            const relativePath = importMatch[2];
            const absImported = path.resolve(importerDir, relativePath);
            const absOld = path.resolve(this.projectRoot, oldBase);

            // If they match (ignoring extension), we need to update it
            if (absImported === absOld) {
              const newTargetAbs = path.resolve(this.projectRoot, newPath.replace(/\.ts$/, ''));
              let newRelative = path.relative(importerDir, newTargetAbs);

              if (newRelative && !newRelative.startsWith('.')) {
                newRelative = `./${newRelative}`;
              }

              if (newRelative) {
                modified = true;
                return line.replace(relativePath, newRelative);
              }
            }
          }
          return line;
        })
        .join('\n');

      if (modified) {
        fs.writeFileSync(importerAbs, newContent, 'utf8');
        updatedFiles.push(path.relative(this.projectRoot, importerAbs));
      }
    }

    return { updatedFiles };
  }
}
