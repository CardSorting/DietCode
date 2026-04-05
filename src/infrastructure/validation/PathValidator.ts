/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Security Boundaries — prevents path traversal and project escapes.
 * Implementation: Normalization and boundary checking.
 */

import path from 'node:path';

export class PathValidator {
  private workspaceRoot: string;
  private readonly sensitivePatterns = [
    /\.git\//,
    /node_modules\//,
    /\.ssh\//,
    /\.bash_history/,
    /\.zsh_history/,
  ];

  private readonly shellInjectionPatterns = /[&|;$`<>]/;

  constructor(workspaceRoot?: string) {
    // Ensure workspaceRoot is absolute and normalized
    this.workspaceRoot = path.normalize(path.resolve(workspaceRoot || process.cwd()));
  }

  /**
   * Validates if a path is safe and within the permitted workspace root.
   * Throws Error if path is outside the boundary or contains malicious patterns.
   */
  validate(targetPath: string): string {
    // 1. Prevent shell injection
    if (this.shellInjectionPatterns.test(targetPath)) {
      const errorMsg = `🛑 [SECURITY] Potential shell injection detected in path: ${targetPath}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // 2. Resolve and normalize
    const absolutePath = path.normalize(path.resolve(this.workspaceRoot, targetPath));

    // 3. Boundary check
    if (!absolutePath.startsWith(this.workspaceRoot)) {
      const errorMsg = `🛑 [SECURITY] Path traversal attempt blocked: ${targetPath} is outside workspace ${this.workspaceRoot}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // 4. Sensitive path check
    const relativePath = path.relative(this.workspaceRoot, absolutePath);
    for (const pattern of this.sensitivePatterns) {
      if (pattern.test(relativePath) || pattern.test(absolutePath)) {
        const errorMsg = `🛑 [SECURITY] Access to sensitive path BLOCKED: ${targetPath}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
    }

    return absolutePath;
  }

  /**
   * Checks if a path is "system" related (e.g., node_modules, .git)
   */
  isSystemPath(targetPath: string): boolean {
    const normalized = targetPath.replace(/\\/g, '/');
    return (
      normalized.includes('/node_modules/') ||
      normalized.includes('/.git/') ||
      normalized.includes('.env')
    );
  }

  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }
}
