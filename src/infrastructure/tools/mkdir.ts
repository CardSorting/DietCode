/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of the mkdir tool.
 * Uses the Domain Filesystem interface — never raw Node.js `fs`.
 * Production hardened with:
 *   - Domain contract alignment (exists/stat, not existsSync/statSync)
 *   - Centralized path validation via PathValidator
 *   - No variable shadowing of `path` module
 *   - Idempotent directory creation
 *   - Separate validate() for composability
 */

import type { ToolDefinition, ToolResult } from '../../domain/agent/ToolDefinition';
import type { Filesystem } from '../../domain/system/Filesystem';
import { validatePath } from './PathValidator';

/** Maximum directory tree depth for mkdir operations */
const MAX_MKDIR_DEPTH = 15;

/**
 * Check if a path already exists as a directory via Domain contract.
 */
function isExistingDirectory(fs: Filesystem, dirPath: string): boolean {
  try {
    if (!fs.exists(dirPath)) return false;
    const stat = fs.stat(dirPath);
    return stat.isDirectory;
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
    const stat = fs.stat(dirPath);
    return stat.isFile;
  } catch {
    return false;
  }
}

/**
 * Create a mkdir tool bound to a Filesystem instance.
 */
export const createMkdirTool = (fs: Filesystem): ToolDefinition<{ path: string }> => ({
  name: 'mkdir',
  description: 'Create a new directory at the specified path. Creates parent directories recursively.',
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

  validate({ path: dirPath }) {
    validatePath(dirPath, 'mkdir');

    // Strip trailing slashes for consistent handling
    const cleanPath = dirPath.replace(/[/\\]+$/, '');

    // Check depth (count forward slashes after normalization)
    const segments = cleanPath.split('/').filter(Boolean);
    if (segments.length > MAX_MKDIR_DEPTH) {
      throw new Error(
        `Directory path depth (${segments.length}) exceeds maximum of ${MAX_MKDIR_DEPTH} levels`
      );
    }
  },

  async execute({ path: dirPath }): Promise<ToolResult> {
    try {
      // Validate input
      this.validate!({ path: dirPath });

      // Strip trailing slashes
      const cleanPath = dirPath.replace(/[/\\]+$/, '') || dirPath;

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
});