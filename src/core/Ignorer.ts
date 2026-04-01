/**
 * [LAYER: CORE]
 * Principle: Pattern Matching — filters noise from the environment.
 * Handles .gitignore and .dietcodeignore patterns.
 */

import type { Filesystem } from '../domain/system/Filesystem';

export class Ignorer {
  private patterns: string[] = [];

  constructor(
    private filesystem: Filesystem,
    private projectRoot: string
  ) {
    this.loadPatterns();
  }

  private loadPatterns() {
    // Default ignore patterns
    this.patterns = [
      '.git',
      'node_modules',
      'dist',
      'build',
      '.gemini',
      '.DS_Store',
    ];

    // Load .gitignore
    const gitignorePath = `${this.projectRoot}/.gitignore`;
    if (this.filesystem.exists(gitignorePath)) {
      const content = this.filesystem.readFile(gitignorePath);
      this.addPatterns(content);
    }

    // Load .dietcodeignore
    const dietcodeignorePath = `${this.projectRoot}/.dietcodeignore`;
    if (this.filesystem.exists(dietcodeignorePath)) {
      const content = this.filesystem.readFile(dietcodeignorePath);
      this.addPatterns(content);
    }
  }

  private addPatterns(content: string) {
    const lines = content.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
    
    this.patterns.push(...lines);
  }

  /**
   * Checks if a path should be ignored.
   */
  isIgnored(path: string): boolean {
    // Simple check: if any pattern matches the path
    for (const pattern of this.patterns) {
      if (this.filesystem.match(pattern, path)) {
        return true;
      }
    }
    return false;
  }
}
