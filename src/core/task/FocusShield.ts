/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: Sovereign Scope Lockdown — The Focus Shield (v6.0)
 * Restricts filesystem access to the "Evidence Bundle" during the SOVEREIGN_DOING state.
 */

import * as path from 'node:path';

export class FocusShield {
  private static instance: FocusShield;
  private allowedPaths: Set<string> = new Set();
  private isActive = false;
  private projectRoot: string = process.cwd();

  private constructor() {}

  public static getInstance(): FocusShield {
    if (!FocusShield.instance) {
      FocusShield.instance = new FocusShield();
    }
    return FocusShield.instance;
  }

  /**
   * Activates the shield with a specific evidence bundle.
   */
  public activate(evidencePaths: string[]): void {
    this.allowedPaths = new Set(evidencePaths.map((p) => this.normalize(p)));

    // Always allow essential config and proto files
    this.allowedPaths.add(this.normalize('package.json'));
    this.allowedPaths.add(this.normalize('tsconfig.json'));
    this.allowedPaths.add(this.normalize('proto.md'));
    this.allowedPaths.add(this.normalize('.dietcode'));

    this.isActive = true;
  }

  /**
   * Deactivates the shield (e.g., when task is DONE or FAILED).
   */
  public deactivate(): void {
    this.isActive = false;
    this.allowedPaths.clear();
  }

  /**
   * Validates if a path is within the sovereign scope.
   */
  public isAllowed(filePath: string): boolean {
    if (!this.isActive) return true;

    const normalizedPath = this.normalize(filePath);

    // Check if the path or any of its parents are in the allowed set
    // (This allows directory-level permissions if needed)
    let current = normalizedPath;
    while (current !== '.') {
      if (this.allowedPaths.has(current)) return true;
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }

    return this.allowedPaths.has(normalizedPath);
  }

  private normalize(filePath: string): string {
    const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(this.projectRoot, filePath);
    return path.relative(this.projectRoot, absPath);
  }

  public getStatus(): { active: boolean; allowedCount: number } {
    return {
      active: this.isActive,
      allowedCount: this.allowedPaths.size,
    };
  }
}
