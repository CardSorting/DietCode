/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of the grep/search tool.
 * Production hardened with:
 *   - Shell injection prevention via shellEscape()
 *   - Domain Filesystem injection (no raw Node.js `fs`)
 *   - Centralized path validation via PathValidator
 *   - Safe regex compilation with backtracking protection
 *   - Bounded results and recursion depth
 *   - Standalone validate (no broken `this` binding)
 *   - Pipe-safe shell execution (handles SIGPIPE from `head`)
 *   - Compiled regex reuse (validated once, used in execute)
 */

import { execSync } from 'node:child_process';
import type { ToolDefinition, ToolResult } from '../../domain/agent/ToolDefinition';
import type { Filesystem } from '../../domain/system/Filesystem';
import {
  MAX_FILE_SIZE_BYTES,
  MAX_RECURSION_DEPTH,
  MAX_RESULT_LINES,
  isSafeExtension,
  isSkippedDirectory,
  shellEscape,
  validatePath,
} from './PathValidator';

// ─── Regex Safety ────────────────────────────────────────────────────

/** Maximum length for a regex pattern to prevent abuse */
const MAX_PATTERN_LENGTH = 1000;

/**
 * Patterns known to cause catastrophic backtracking.
 * Rejects nested quantifiers like (a+)+, (a*)*b, (.+.+)+
 */
const DANGEROUS_REGEX = /(\([^)]*[+*][^)]*\))[+*]|(\.\*){4,}/;

/**
 * Safely compile a regex pattern.
 * Returns null if the pattern is invalid or potentially dangerous.
 */
function safeCompileRegex(pattern: string): RegExp | null {
  try {
    if (DANGEROUS_REGEX.test(pattern)) {
      return null;
    }
    return new RegExp(pattern);
  } catch {
    return null;
  }
}

/**
 * Test a single line against a regex safely.
 * Catches runtime regex errors (stack overflow on pathological input).
 */
function matchLine(line: string, regex: RegExp): boolean {
  try {
    return regex.test(line);
  } catch {
    return false;
  }
}

// ─── Validation ──────────────────────────────────────────────────────

/**
 * Validate grep input. Returns the compiled regex to avoid double-compilation.
 * The pattern is validated exactly once and the result is reused in execute().
 */
function validateAndCompilePattern(pattern: string): RegExp {
  if (!pattern || pattern.trim().length === 0) {
    throw new Error('Search pattern is required');
  }

  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new Error(`Pattern exceeds maximum length of ${MAX_PATTERN_LENGTH} characters`);
  }

  const regex = safeCompileRegex(pattern);
  if (!regex) {
    throw new Error(`Invalid or potentially dangerous regex pattern: ${pattern.slice(0, 100)}`);
  }

  return regex;
}

/**
 * Standalone validate function for the tool definition's `validate` property.
 * Throws on invalid input — does NOT return the regex (that's for internal use).
 */
function validateGrepInput(input: { pattern: string; targetPath?: string }): void {
  validateAndCompilePattern(input.pattern);
}

// ─── Shell Execution Helpers ─────────────────────────────────────────

/** Timeout for shell-based grep commands (30 seconds) */
const SHELL_TIMEOUT_MS = 30_000;

/** Maximum output buffer for shell commands (10MB) */
const SHELL_MAX_BUFFER = 10 * 1024 * 1024;

/**
 * Execute a shell command for grep, handling pipe-related exit codes.
 *
 * When piping through `head -n N`, the upstream command (rg/grep) gets
 * SIGPIPE when head closes the pipe after N lines. execSync throws on
 * non-zero exit codes. We need to distinguish:
 *   - exit 0: matches found
 *   - exit 1: no matches (rg/grep convention)
 *   - exit 141 (128+13): SIGPIPE — still has valid output from head
 *   - other: real error
 */
function execShellGrep(command: string): string | null {
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: SHELL_TIMEOUT_MS,
      maxBuffer: SHELL_MAX_BUFFER,
    });
    return output.trim() || null;
  } catch (error: unknown) {
    // execSync throws for non-zero exits. Check if we still got output.
    if (error && typeof error === 'object' && 'stdout' in error) {
      const stdout = (error as { stdout?: string }).stdout;
      if (typeof stdout === 'string' && stdout.trim().length > 0) {
        // SIGPIPE or exit-1-with-partial-output: return what we got
        return stdout.trim();
      }
    }
    return null;
  }
}

/**
 * Try ripgrep (fastest, most reliable).
 */
function tryRipgrep(safePattern: string, safePath: string): string | null {
  return execShellGrep(
    `rg -n --max-filesize 10M ${safePattern} ${safePath} | head -n ${MAX_RESULT_LINES}`,
  );
}

/**
 * Try system grep as fallback.
 */
function trySystemGrep(safePattern: string, safePath: string): string | null {
  return execShellGrep(`grep -rn ${safePattern} ${safePath} | head -n ${MAX_RESULT_LINES}`);
}

// ─── Filesystem Fallback Walk ────────────────────────────────────────

/**
 * Pure-TypeScript grep fallback using injected Filesystem.
 * Handles both single-file and directory search.
 */
function filesystemGrep(
  fs: Filesystem,
  targetPath: string,
  regex: RegExp,
): { results: string[]; durationMs: number } {
  const results: string[] = [];
  const startTime = Date.now();

  if (!fs.exists(targetPath)) {
    return { results, durationMs: Date.now() - startTime };
  }

  const stat = fs.stat(targetPath);

  if (stat.isFile) {
    searchFile(fs, targetPath, regex, results);
  } else if (stat.isDirectory) {
    walkDirectory(fs, targetPath, regex, results, 0);
  }

  return { results, durationMs: Date.now() - startTime };
}

/**
 * Search a single file for regex matches.
 */
function searchFile(fs: Filesystem, filePath: string, regex: RegExp, results: string[]): void {
  try {
    const content = fs.readFile(filePath);
    if (content.length > MAX_FILE_SIZE_BYTES) return;

    const lines = content.split('\n');
    for (let i = 0; i < lines.length && results.length < MAX_RESULT_LINES; i++) {
      const line = lines[i] ?? '';
      if (matchLine(line, regex)) {
        results.push(`${filePath}:${i + 1}:${line}`);
      }
    }
  } catch {
    // Skip unreadable files
  }
}

/**
 * Recursively walk a directory and search files.
 */
function walkDirectory(
  fs: Filesystem,
  dir: string,
  regex: RegExp,
  results: string[],
  depth: number,
): void {
  if (depth > MAX_RECURSION_DEPTH) return;
  if (results.length >= MAX_RESULT_LINES) return;

  try {
    const entries = fs.readdir(dir);

    for (const entry of entries) {
      if (results.length >= MAX_RESULT_LINES) break;

      const fullPath = dir.endsWith('/') ? `${dir}${entry.name}` : `${dir}/${entry.name}`;

      if (entry.isDirectory) {
        if (!isSkippedDirectory(entry.name)) {
          walkDirectory(fs, fullPath, regex, results, depth + 1);
        }
      } else {
        if (isSafeExtension(entry.name)) {
          searchFile(fs, fullPath, regex, results);
        }
      }
    }
  } catch {
    // Skip inaccessible directories
  }
}

// ─── Tool Factory ────────────────────────────────────────────────────

/**
 * Create a grep tool bound to a Filesystem instance.
 *
 * Strategy: Try ripgrep → grep → Node.js fallback (in that order).
 * The Node.js fallback uses the injected Filesystem for testability.
 */
export function createGrepTool(fs: Filesystem): ToolDefinition<{
  pattern: string;
  targetPath?: string;
}> {
  return {
    name: 'grep',
    description:
      'Search for a regex pattern in file contents. Uses ripgrep if available, falls back to built-in search.',
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

    validate: validateGrepInput,

    async execute(input): Promise<ToolResult> {
      const targetPath = input.targetPath ?? '.';

      try {
        // Validate + compile pattern once (no double compilation)
        const regex = validateAndCompilePattern(input.pattern);
        validatePath(targetPath, 'search');

        // Sanitize for shell usage — prevents injection attacks
        const safePattern = shellEscape(input.pattern);
        const safePath = shellEscape(targetPath);

        // 1. Try ripgrep (fastest, most reliable)
        const rgResult = tryRipgrep(safePattern, safePath);
        if (rgResult) {
          const lineCount = rgResult.split('\n').length;
          return {
            content:
              lineCount >= MAX_RESULT_LINES
                ? `Found ${lineCount}+ matches (truncated to ${MAX_RESULT_LINES}):\n${rgResult}`
                : rgResult,
          };
        }

        // 2. Try system grep
        const grepResult = trySystemGrep(safePattern, safePath);
        if (grepResult) {
          return { content: grepResult };
        }

        // 3. Pure-TypeScript fallback using injected Filesystem
        // Reuse the regex compiled during validation
        const { results, durationMs } = filesystemGrep(fs, targetPath, regex);

        if (results.length === 0) {
          return {
            content: `No matches found for '${input.pattern}' (searched in ${(durationMs / 1000).toFixed(2)}s)`,
          };
        }

        return {
          content: `Found ${results.length} match${results.length === 1 ? '' : 'es'} (${(durationMs / 1000).toFixed(2)}s):\n${results.join('\n')}`,
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: `Error running grep: ${message}`, isError: true };
      }
    },
  };
}

/**
 * Legacy export for backward compatibility.
 * @deprecated Use createGrepTool(fs) instead
 */
export { createGrepTool as grepToolFactory };
