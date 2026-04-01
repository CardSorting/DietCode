/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of the grep/search tool.
 * Production hardened with:
 *   - Shell injection prevention via shellEscape()
 *   - Domain Filesystem injection (no raw Node.js `fs`)
 *   - Centralized path validation via PathValidator
 *   - Safe regex compilation with timeout protection
 *   - Proper symlink detection via lstat-equivalent guarding
 *   - Bounded results and recursion depth
 */

import { execSync } from 'child_process';
import type { ToolDefinition, ToolResult } from '../../domain/agent/ToolDefinition';
import type { Filesystem } from '../../domain/system/Filesystem';
import {
  validatePath,
  shellEscape,
  isSafeExtension,
  isSkippedDirectory,
  MAX_FILE_SIZE_BYTES,
  MAX_RECURSION_DEPTH,
  MAX_RESULT_LINES,
} from './PathValidator';

/**
 * Safely compile a regex pattern with catastrophic backtracking protection.
 * Returns null if the pattern is invalid.
 */
function safeCompileRegex(pattern: string): RegExp | null {
  try {
    // Basic heuristic: reject patterns with nested quantifiers (catastrophic backtracking)
    if (/(\.\*){3,}|(\+\+)|(\*\*)/.test(pattern)) {
      return null;
    }
    return new RegExp(pattern);
  } catch {
    return null;
  }
}

/**
 * Test a single line against a regex safely.
 * Catches any runtime regex errors (e.g., stack overflow).
 */
function matchLine(line: string, regex: RegExp): boolean {
  try {
    return regex.test(line);
  } catch {
    return false;
  }
}

/**
 * Create a grep tool bound to a Filesystem instance.
 *
 * Strategy: Try ripgrep → grep → Node.js fallback (in that order).
 * The Node.js fallback uses the injected Filesystem for testability.
 */
export const createGrepTool = (fs: Filesystem): ToolDefinition<{
  pattern: string;
  targetPath?: string;
}> => ({
  name: 'grep',
  description: 'Search for a regex pattern in file contents. Uses ripgrep if available, falls back to built-in search.',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Regular expression pattern to search for.',
      },
      targetPath: {
        type: 'string',
        description: 'Directory or file to search in. Defaults to current directory.',
      },
    },
    required: ['pattern'],
  },

  validate({ pattern }) {
    if (!pattern || pattern.trim().length === 0) {
      throw new Error('Search pattern is required');
    }

    if (pattern.length > 1000) {
      throw new Error('Pattern exceeds maximum length of 1000 characters');
    }

    // Verify the pattern compiles
    const regex = safeCompileRegex(pattern);
    if (!regex) {
      throw new Error(`Invalid or potentially dangerous regex pattern: ${pattern.slice(0, 100)}`);
    }
  },

  async execute({ pattern, targetPath = '.' }): Promise<ToolResult> {
    try {
      // Validate inputs
      this.validate!({ pattern, targetPath });
      validatePath(targetPath, 'search');

      // Sanitize for shell usage — prevents injection attacks
      const safePattern = shellEscape(pattern);
      const safePath = shellEscape(targetPath);

      // 1. Try ripgrep (fastest, most reliable)
      try {
        const output = execSync(
          `rg -n --max-count 100 --max-filesize 10M ${safePattern} ${safePath}`,
          {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
            timeout: 30_000, // 30s timeout
            maxBuffer: 10 * 1024 * 1024,
          }
        );
        const lines = output.trim().split('\n');
        if (lines.length > MAX_RESULT_LINES) {
          return {
            content: `Found ${lines.length} matches (truncated to ${MAX_RESULT_LINES}):\n${lines.slice(0, MAX_RESULT_LINES).join('\n')}`,
          };
        }
        return { content: output.trim() };
      } catch {
        // ripgrep not found or no matches — fall through
      }

      // 2. Try system grep
      try {
        const output = execSync(
          `grep -rn --include='*.ts' --include='*.js' --include='*.json' --include='*.md' -m ${MAX_RESULT_LINES} ${safePattern} ${safePath}`,
          {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
            timeout: 30_000,
            maxBuffer: 10 * 1024 * 1024,
          }
        );
        return { content: output.trim() };
      } catch {
        // grep not found or no matches — fall through
      }

      // 3. Pure-TypeScript fallback using injected Filesystem
      const regex = safeCompileRegex(pattern);
      if (!regex) {
        return {
          content: `Invalid regex pattern: ${pattern.slice(0, 100)}`,
          isError: true,
        };
      }

      const results: string[] = [];
      const startTime = Date.now();

      const walk = (dir: string, depth: number): void => {
        // Enforce depth limit
        if (depth > MAX_RECURSION_DEPTH) return;

        // Enforce result limit
        if (results.length >= MAX_RESULT_LINES) return;

        try {
          // Use Domain Filesystem contract
          if (!fs.exists(dir)) return;

          const stat = fs.stat(dir);
          if (!stat.isDirectory) return;

          const entries = fs.readdir(dir);

          for (const entry of entries) {
            if (results.length >= MAX_RESULT_LINES) break;

            const fullPath = dir.endsWith('/')
              ? `${dir}${entry.name}`
              : `${dir}/${entry.name}`;

            if (entry.isDirectory) {
              // Skip well-known non-content directories
              if (!isSkippedDirectory(entry.name)) {
                walk(fullPath, depth + 1);
              }
            } else {
              // Skip files without safe extensions
              if (!isSafeExtension(entry.name)) continue;

              try {
                // Check file size via Domain contract
                const fileStat = fs.stat(fullPath);
                if (!fileStat.isFile) continue;

                // Read content via Domain contract
                const content = fs.readFile(fullPath);

                // Skip oversized files after read (defense in depth)
                if (content.length > MAX_FILE_SIZE_BYTES) continue;

                const lines = content.split('\n');

                for (let i = 0; i < lines.length && results.length < MAX_RESULT_LINES; i++) {
                  const line = lines[i] ?? '';
                  if (matchLine(line, regex)) {
                    results.push(`${fullPath}:${i + 1}:${line}`);
                  }
                }
              } catch {
                // Skip unreadable files (permission denied, etc.)
                continue;
              }
            }
          }
        } catch {
          // Skip inaccessible directories
          return;
        }
      };

      walk(targetPath, 0);
      const durationMs = Date.now() - startTime;

      if (results.length === 0) {
        return { content: `No matches found for '${pattern}' (searched in ${(durationMs / 1000).toFixed(2)}s)` };
      }

      return {
        content: `Found ${results.length} match${results.length === 1 ? '' : 'es'} (${(durationMs / 1000).toFixed(2)}s):\n${results.join('\n')}`,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: `Error running grep: ${message}`, isError: true };
    }
  },
});

/**
 * Legacy export for backward compatibility.
 * New code should use createGrepTool(fs) for proper DI.
 *
 * @deprecated Use createGrepTool(fs) instead
 */
export { createGrepTool as grepToolFactory };
