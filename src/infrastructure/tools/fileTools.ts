/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of file read/write tools.
 * Uses the Domain Filesystem interface — never raw Node.js `fs`.
 * Production hardened with:
 *   - Domain contract alignment (exists/stat, not existsSync/statSync)
 *   - Centralized path validation via PathValidator
 *   - File extension enforcement
 *   - Separate validate() for composability
 *   - Single stat() call per invocation (no TOCTOU race)
 */

import type { ToolDefinition, ToolResult } from '../../domain/agent/ToolDefinition';
import type { Filesystem } from '../../domain/system/Filesystem';
import { validatePath, MAX_FILE_SIZE_BYTES } from './PathValidator';

/**
 * Allowed extensions for read operations.
 * Write operations are unrestricted (the agent may need to create any file type).
 */
const READABLE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.json',
  '.md', '.txt', '.sql',
  '.yaml', '.yml',
  '.css', '.scss', '.html', '.xml',
  '.log', '.env', '.toml', '.ini', '.cfg',
  '.sh', '.bash', '.zsh', '.py', '.go', '.rs',
  '.java', '.kt', '.swift', '.c', '.cpp', '.h',
];

/**
 * Check if a path has a readable extension.
 * Paths without extensions are allowed (e.g., Makefile, Dockerfile).
 */
function hasReadableExtension(filePath: string): boolean {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1 || lastDot < filePath.lastIndexOf('/')) {
    // No extension or dot is in a directory name — allow (Makefile, Dockerfile, etc.)
    return true;
  }
  const ext = filePath.slice(lastDot).toLowerCase();
  return READABLE_EXTENSIONS.includes(ext);
}

/**
 * Create a read_file tool bound to a Filesystem instance.
 */
export const createReadFileTool = (fs: Filesystem): ToolDefinition<{ path: string }> => ({
  name: 'read_file',
  description: 'Read the contents of a file at the specified path.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Absolute or relative path to the file to read.' },
    },
    required: ['path'],
  },

  validate({ path }) {
    validatePath(path, 'read');

    if (!hasReadableExtension(path)) {
      const ext = path.slice(path.lastIndexOf('.'));
      throw new Error(`File extension '${ext}' is not in the allowed read list`);
    }
  },

  async execute({ path }): Promise<ToolResult> {
    try {
      // Validate input
      this.validate!({ path });

      // Check existence via Domain contract
      if (!fs.exists(path)) {
        return { content: `File not found: ${path}`, isError: true };
      }

      // Single stat call — Domain contract returns { isDirectory, isFile, mtimeMs }
      const fileStat = fs.stat(path);

      if (!fileStat.isFile) {
        return { content: `Not a file (is directory): ${path}`, isError: true };
      }

      // Read content
      const content = fs.readFile(path);

      // Post-read size check (defense in depth)
      if (content.length > MAX_FILE_SIZE_BYTES) {
        return {
          content: `File exceeds maximum readable size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
          isError: true,
        };
      }

      return { content };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: `Error reading file: ${message}`, isError: true };
    }
  },
});

/**
 * Create a write_file tool bound to a Filesystem instance.
 */
export const createWriteFileTool = (fs: Filesystem): ToolDefinition<{ path: string; content: string }> => ({
  name: 'write_file',
  description: 'Write content to a file at the specified path. Creates parent directories if needed.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Absolute or relative path to the file to write.' },
      content: { type: 'string', description: 'Content to write to the file.' },
    },
    required: ['path', 'content'],
  },

  validate({ path, content }) {
    validatePath(path, 'write');

    if (content === undefined || content === null) {
      throw new Error('Content is required');
    }

    if (typeof content !== 'string') {
      throw new Error('Content must be a string');
    }

    if (content.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(`Content exceeds maximum size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`);
    }
  },

  async execute({ path, content }): Promise<ToolResult> {
    try {
      // Validate input
      this.validate!({ path, content });

      const contentStr = String(content);

      fs.writeFile(path, contentStr);
      return { content: `Successfully wrote ${contentStr.length} bytes to ${path}` };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: `Error writing file: ${message}`, isError: true };
    }
  },
});
