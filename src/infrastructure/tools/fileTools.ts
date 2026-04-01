/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of basic file-related tools.
 * Uses the Domain Filesystem interface for operations.
 * Production hardened with path validation and error handling.
 */

import type { ToolDefinition, ToolResult } from '../../domain/agent/ToolDefinition';
import type { Filesystem } from '../../domain/system/Filesystem';

// Production hardening constants
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit
const MAX_PATH_LENGTH = 4096;
const ALLOWED_FILE_EXTENSIONS = ['.ts', '.js', '.json', '.md', '.txt', '.sql', '.yaml', '.yml'];
const FORBIDDEN_PATHS = ['../', '..\\', '/etc/passwd', '/etc/shadow', '/bin', '/sbin'];

/**
 * Validate file path for security.
 * Prevents path traversal attacks and invalid characters.
 */
function validatePath(path: string, operation: 'read' | 'write' | 'mkdir'): void {
  // Check path length
  if (path.length > MAX_PATH_LENGTH) {
    throw new Error(`Path exceeds maximum length (${MAX_PATH_LENGTH} characters)`);
  }

  // Check for forbidden paths
  const forbiddenFound = FORBIDDEN_PATHS.some(forbidden => 
    path.includes(forbidden) || path.includes(forbidden.replace('/', ''))
  );
  if (forbiddenFound) {
    throw new Error('Path contains forbidden elements');
  }

  // Check for path traversal attempts
  if (path.match(/\.\.\/|\.\.\\|^[\\/]+/) && operation !== 'mkdir') {
    throw new Error('Path traversal detected');
  }

  // Basic validation for read/write operations
  if (operation !== 'mkdir') {
    if (!path || path.trim().length === 0) {
      throw new Error('Path is required');
    }

    if (path.length < 2) {
      throw new Error(`Path too short (${path.length} characters). Minimum 2 required.`);
    }
  }
}

export const createReadFileTool = (fs: Filesystem): ToolDefinition<{ path: string }> => ({
  name: 'read_file',
  description: 'Read the contents of a file.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file to read.' },
    },
    required: ['path'],
  },
  async execute({ path }): Promise<ToolResult> {
    try {
      validatePath(path, 'read');

      // Check file access
      if (!fs.existsSync(path)) {
        throw new Error(`File not found: ${path}`);
      }

      // Check read permissions
      if (!fs.statSync(path).isFile()) {
        throw new Error(`Not a file: ${path}`);
      }

      // Check file size
      const fileSize = fs.statSync(path).size;
      if (fileSize > MAX_FILE_SIZE_BYTES) {
        throw new Error(`File exceeds maximum size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`);
      }

      const content = fs.readFile(path);
      return { content };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return { content: error.message, isError: true };
      }
      return {
        content: `Unknown error reading file: ${String(error)}`,
        isError: true
      };
    }
  },
});

export const createWriteFileTool = (fs: Filesystem): ToolDefinition<{ path: string; content: string }> => ({
  name: 'write_file',
  description: 'Write content to a file.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to write the file to.' },
      content: { type: 'string', description: 'Content to write.' },
    },
    required: ['path', 'content'],
  },
  async execute({ path, content }): Promise<ToolResult> {
    try {
      validatePath(path, 'write');

      // Validate content length (prevent DoS)
      if (content.length > MAX_FILE_SIZE_BYTES) {
        throw new Error(`Content exceeds maximum size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`);
      }

      // Convert to string if content is not already
      const stringContent = String(content);

      fs.writeFile(path, stringContent);
      return { content: `Successfully wrote to ${path}` };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return { content: error.message, isError: true };
      }
      return {
        content: `Unknown error writing file: ${String(error)}`,
        isError: true
      };
    }
  },
});
