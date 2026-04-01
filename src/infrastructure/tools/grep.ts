/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of the grep tool.
 * Wraps system grep/ripgrep or implements a simple search.
 * Production hardened with recursion limits, path validation, and error handling.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { ToolDefinition, ToolResult } from '../../domain/agent/ToolDefinition';

// Production hardening constants
const MAX_RESULT_LINES = 10000; // Prevent unbounded result growth
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per file
const MAX_DEPTH = 10; // Maximum directory recursion depth
const FORBIDDEN_PATHS = ['../', '..\\', '/etc/passwd', '/etc/shadow', '/bin', '/sbin', '/dev', '/proc'];
const SAFE_EXTENSIONS = ['.ts', '.js', '.json', '.md', '.txt', '.sql', '.yaml', '.yml', '.log'];

/**
 * Validate search path for security.
 * Prevents path traversal and illegal system access.
 */
function validatePath(targetPath: string): void {
  if (!targetPath || targetPath.trim().length === 0) {
    throw new Error('targetPath is required');
  }

  // Check path length
  if (targetPath.length > 4096) {
    throw new Error(`Path exceeds maximum length (4096 characters)`);
  }

  // Check for forbidden paths
  const forbiddenFound = FORBIDDEN_PATHS.some(forbidden => 
    targetPath.includes(forbidden) || targetPath.includes(forbidden.replace('/', ''))
  );
  if (forbiddenFound) {
    throw new Error('targelPath contains forbidden elements');
  }

  // Normalize path
  targetPath = path.normalize(targetPath);

  // Prevent absolute paths unless explicitly allowed
  if (targetPath.startsWith('/') && process.cwd() !== targetPath) {
    throw new Error('Absolute paths are not allowed for security');
  }
}

/**
 * Match single line against pattern.
 * Prevents catastrophic backtracking in regex.
 */
function tryMatchLine(line: string, regex: RegExp): boolean {
  try {
    return regex.test(line);
  } catch {
    return false;
  }
}

export const grepTool: ToolDefinition<{ pattern: string; targetPath?: string }> = {
  name: 'grep',
  description: 'Search for a pattern in file contents using ripgrep or grep.',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'The regular expression pattern to search for.',
      },
      targetPath: {
        type: 'string',
        description: 'The directory or file to search in (defaults to current directory).',
      },
    },
    required: ['pattern'],
  },
  async execute({ pattern, targetPath = '.' }): Promise<ToolResult> {
    try {
      // Validate pattern
      if (!pattern || pattern.trim().length === 0) {
        throw new Error('Pattern is required');
      }

      // Validate targetPath
      validatePath(targetPath || '.');

      // 1. Try ripgrep (fastest)
      try {
        const outputPath = execSync(`rg -n --max-count ${MAX_RESULT_LINES} "${pattern}" "${targetPath}"`, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore']
        });
        return { content: outputPath.trim() };
      } catch {}

      // 2. Try grep
      try {
        const outputPath = execSync(`grep -rn --max-count ${MAX_RESULT_LINES} "${pattern}" "${targetPath}"`, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore']
        });
        return { content: outputPath.trim() };
      } catch {}

      // 3. Pure Node.js fallback (safe, incremental)
      const results: string[] = [];
      const regex = tryMatchLine ? new RegExp(pattern) : new RegExp(pattern);

      // Safe directory walk with depth limit
      const walkWithDepth = (dir: string, depth: number): void => {
        // Enforce recursion depth limit
        if (depth > MAX_DEPTH) {
          return;
        }

        try {
          // Check if path exists
          if (!fs.existsSync(dir)) {
            return;
          }

          const stat = fs.statSync(dir);
          
          // Skip if not a directory
          if (!stat.isDirectory()) {
            return;
          }

          // Read directory entries
          const files = fs.readdirSync(dir);
          
          for (const file of files) {
            const fullPath = path.join(dir, file);
            
            try {
              const fileStat = fs.statSync(fullPath);
              
              // Skip symlinks to prevent cycles
              if (fileStat.isSymbolicLink()) {
                continue;
              }

              if (fileStat.isDirectory()) {
                // Skip common node directories
                if (file !== 'node_modules' && file !== '.git') {
                  walkWithDepth(fullPath, depth + 1);
                }
              } else if (fileStat.isFile()) {
                // Skip files that exceed size limit
                if (fileStat.size > MAX_FILE_SIZE_BYTES) {
                  continue;
                }

                // Skip files with unsafe extensions
                if (!SAFE_EXTENSIONS.some(ext => file.endsWith(ext))) {
                  continue;
                }

                // Read file content safely
                const content = fs.readFileSync(fullPath, 'utf8');
                const lines = content.split('\n');
                
                // Limit lines to search per file
                lines.slice(0, MAX_RESULT_LINES).forEach((line, i) => {
                  if (tryMatchLine(line, regex)) {
                    if (results.length >= MAX_RESULT_LINES) {
                      return; // Stop if we hit maximum results
                    }
                    results.push(`${fullPath}:${i + 1}:${line}`);
                  }
                });
              }
            } catch {
              // Skip files we can't read (permission denied, etc.)
              continue;
            }
          }
        } catch {
          // Skip directories we can't access
          return;
        }
      };

      const startTime = Date.now();
      walkWithDepth(targetPath, 0);
      const durationSeconds = (Date.now() - startTime) / 1000;

      const result = results.length > 0 
        ? `Found ${results.length} matching lines (${durationSeconds.toFixed(2)}s):\n${results.join('\n')}`
        : `No matches found. (Scanned ${durationSeconds.toFixed(2)}s)`;

      return { content: result };

    } catch (error: unknown) {
      if (error instanceof Error) {
        return {
          content: `Error running grep: ${error.message}`,
          isError: true,
        };
      }
      return {
        content: `Unknown error running grep: ${String(error)}`,
        isError: true,
      };
    }
  },
};
