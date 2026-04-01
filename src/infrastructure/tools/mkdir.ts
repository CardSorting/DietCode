/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of the mkdir tool.
 * Uses the Domain Filesystem interface.
 * Production hardened with path validation, conflict prevention, and error handling.
 */

import type { ToolDefinition, ToolResult } from '../../domain/agent/ToolDefinition';
import type { Filesystem } from '../../domain/system/Filesystem';

// Production hardening constants
const MAX_PATH_LENGTH = 4096;
const MAX_DEPTH = 5; // Maximum directory tree depth
const FORBIDDEN_PATHS = ['../', '..\\', '/etc/passwd', '/etc/shadow', '/bin', '/sbin', '/dev', '/proc', '/root'];

/**
 * Validate directory creation path for security.
 * Prevents path traversal, deep recursion, and conflicts.
 */
function validatePath(path: string): void {
  if (!path || path.trim().length === 0) {
    throw new Error('path is required');
  }

  // Check path length
  if (path.length > MAX_PATH_LENGTH) {
    throw new Error(`path exceeds maximum length (${MAX_PATH_LENGTH} characters)`);
  }

  // Check for forbidden paths
  const forbiddenFound = FORBIDDEN_PATHS.some(forbidden => 
    path.includes(forbidden) || path.includes(forbidden.replace('/', ''))
  );
  if (forbiddenFound) {
    throw new Error('path contains forbidden elements');
  }

  // Check for path traversal attempts
  if (path.match(/\.\.\/|\.\.\\|^[\\/]+/)) {
    throw new Error('path traversal detected');
  }

  // Normalize path
  path = path.normalize(path);

  // Prevent absolute paths except in safe locations
  if (path.startsWith('/') && !path.startsWith('/tmp') && !path.startsWith('/var/tmp')) {
    throw new Error('Creating directories outside allowed locations is not permitted');
  }

  // Check if path is too deep (> 5 levels)
  const depth = (path.match(/\//g) || []).length;
  if (depth > MAX_DEPTH) {
    throw new Error(`path depth exceeds maximum (${MAX_DEPTH} levels)`);
  }

  // Check for trailing slashes (mkdir doesn't like them)
  if (path.endsWith('/') || path.endsWith('\\')) {
    path = path.slice(0, -1);
  }
}

/**
 * Check if path exists and is a directory.
 */
function isDirectory(fs: Filesystem, path: string): boolean {
  try {
    return fs.existsSync(path) && fs.statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export const createMkdirTool = (fs: Filesystem): ToolDefinition<{ path: string }> => ({
  name: 'mkdir',
  description: 'Create a new directory at the specified path.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path of the directory to create.',
      },
    },
    required: ['path'],
  },
  async execute({ path }): Promise<ToolResult> {
    try {
      // Validate input
      validatePath(path);

      // Check if path already exists
      if (isDirectory(fs, path)) {
        return {
          content: `Directory already exists: ${path}`,
          isError: false
        };
      }

      // Attempt to create directory
      fs.mkdir(path);
      return { content: `Successfully created directory: ${path}` };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return {
          content: `Error creating directory: ${error.message}`,
          isError: true
        };
      }
      return {
        content: `Unknown error creating directory: ${String(error)}`,
        isError: true
      };
    }
  },
});