/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of the mkdir tool.
 * Uses the Domain Filesystem interface — never raw Node.js `fs`.
 * Production hardened with:
 *   - Domain contract alignment (exists/stat)
 *   - Centralized path validation via PathValidator
 *   - Standalone validate (no broken `this` binding)
 *   - Idempotent creation + file conflict detection
 */

import type { ToolDefinition, ToolResult } from '../../domain/agent/ToolDefinition';
import type { Filesystem } from '../../domain/system/Filesystem';
import { normalizePath, validatePath } from './PathValidator';

/** Maximum directory tree depth for mkdir operations */
const MAX_MKDIR_DEPTH = 15;

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Check if a path already exists as a directory via Domain contract.
 */
function isExistingDirectory(fs: Filesystem, dirPath: string): boolean {
  try {
    if (!fs.exists(dirPath)) return false;
    return fs.stat(dirPath).isDirectory;
  } catch {
    return false;
  }
}

/**
 * Check if a path exists as a file (would conflict with mkdir).
 */
function isExistingFile(fs: Filesystem, dirPath: string): boolean {
  try {
    if (!fs.exists(dirPath)) return false;
    return fs.stat(dirPath).isFile;
  } catch {
    return false;
  }
}

// ─── Validation ──────────────────────────────────────────────────────

function validateMkdirInput(input: { path: string }): void {
  validatePath(input.path, 'mkdir');

  const cleanPath = normalizePath(input.path);

  // Check depth (count path segments)
  const segments = cleanPath.split('/').filter(Boolean);
  if (segments.length > MAX_MKDIR_DEPTH) {
    throw new Error(
      `Directory path depth (${segments.length}) exceeds maximum of ${MAX_MKDIR_DEPTH} levels`,
    );
  }
}

// ─── Tool Factory ────────────────────────────────────────────────────

/**
 * Create a mkdir tool bound to a Filesystem instance.
 */
export function createMkdirTool(fs: Filesystem): ToolDefinition<{ path: string }> {
  return {
    name: 'mkdir',
    description:
      'Create a new directory at the specified path. Creates parent directories recursively.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path of the directory to create.',
        },
      },
      required: ['path'],
    },

    validate: validateMkdirInput,

    async execute(input): Promise<ToolResult> {
      try {
        validateMkdirInput(input);

        const cleanPath = normalizePath(input.path);

        // Check if already exists as directory (idempotent)
        if (isExistingDirectory(fs, cleanPath)) {
          return {
            content: `Directory already exists: ${cleanPath}`,
            isError: false,
          };
        }

        // Check if a file exists at this path (conflict)
        if (isExistingFile(fs, cleanPath)) {
          return {
            content: `Cannot create directory: a file already exists at ${cleanPath}`,
            isError: true,
          };
        }

        // Create directory via Domain contract (recursive)
        fs.mkdir(cleanPath);

        return { content: `Successfully created directory: ${cleanPath}` };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: `Error creating directory: ${message}`, isError: true };
      }
    },
  };
}
