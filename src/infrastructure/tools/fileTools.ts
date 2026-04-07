/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of file read/write tools.
 * Uses the Domain Filesystem interface — never raw Node.js `fs`.
 * Production hardened with:
 *   - Domain contract alignment (exists/stat, not existsSync/statSync)
 *   - Centralized path validation via PathValidator
 *   - File extension enforcement
 *   - Standalone validate() (no `this` binding issues)
 *   - Single stat() call per invocation (no TOCTOU race)
 */

import type { ToolDefinition, ToolResult } from '../../domain/agent/ToolDefinition';
import type { Filesystem } from '../../domain/system/Filesystem';
import { MAX_FILE_SIZE_BYTES, MAX_RESULT_LINES, validatePath } from './PathValidator';

/**
 * Allowed extensions for read operations.
 * Write operations are unrestricted (the agent may need to create any file type).
 */
const READABLE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.txt',
  '.sql',
  '.yaml',
  '.yml',
  '.css',
  '.scss',
  '.html',
  '.xml',
  '.log',
  '.env',
  '.toml',
  '.ini',
  '.cfg',
  '.sh',
  '.bash',
  '.zsh',
  '.py',
  '.go',
  '.rs',
  '.java',
  '.kt',
  '.swift',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.cs',
  '.rb',
  '.php',
  '.lua',
  '.dockerfile',
  '.makefile',
]);

/**
 * Check if a path has a readable extension.
 * Paths without extensions are allowed (e.g., Makefile, Dockerfile).
 */
function hasReadableExtension(filePath: string): boolean {
  const lastDot = filePath.lastIndexOf('.');
  const lastSlash = filePath.lastIndexOf('/');
  if (lastDot === -1 || lastDot < lastSlash) {
    // No extension or dot is in a directory name — allow (Makefile, Dockerfile, etc.)
    return true;
  }
  const ext = filePath.slice(lastDot).toLowerCase();
  return READABLE_EXTENSIONS.has(ext);
}

// ─── Standalone Validation Functions ─────────────────────────────────
// These are standalone functions, NOT object methods.
// They MUST NOT use `this` — they are assigned to `validate` on the
// tool definition object, but also called directly in `execute()`.

function validateReadInput(input: { path: string }): void {
  validatePath(input.path, 'read');

  if (!hasReadableExtension(input.path)) {
    const ext = input.path.slice(input.path.lastIndexOf('.'));
    throw new Error(`File extension '${ext}' is not in the allowed read list`);
  }
}

function validateWriteInput(input: { path: string; content: string }): void {
  validatePath(input.path, 'write');

  if (input.content === undefined || input.content === null) {
    throw new Error('Content is required');
  }

  if (typeof input.content !== 'string') {
    throw new Error('Content must be a string');
  }

  if (input.content.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Content exceeds maximum size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`);
  }
}

function validateReadRangeInput(input: { path: string; startLine: number; endLine: number }): void {
  validatePath(input.path, 'read');

  if (!hasReadableExtension(input.path)) {
    const ext = input.path.slice(input.path.lastIndexOf('.'));
    throw new Error(`File extension '${ext}' is not in the allowed read list`);
  }

  if (!Number.isInteger(input.startLine) || input.startLine < 1) {
    throw new Error('startLine must be a positive integer');
  }
  if (!Number.isInteger(input.endLine) || input.endLine < 1) {
    throw new Error('endLine must be a positive integer');
  }
  if (input.startLine > input.endLine) {
    throw new Error(
      `startLine (${input.startLine}) cannot be greater than endLine (${input.endLine})`,
    );
  }

  const MAX_RANGE = 1000;
  if (input.endLine - input.startLine + 1 > MAX_RANGE) {
    throw new Error(`Line range exceeds maximum of ${MAX_RANGE} lines`);
  }
}

function validateListFilesInput(input: { path: string; recursive?: boolean }): void {
  // Use 'search' operation type — allows 1-char paths like '.'
  // ('read' requires min 2 chars which rejects '.')
  validatePath(input.path, 'search');
}

// ─── Tool Factories ──────────────────────────────────────────────────

/**
 * Create a read_file tool bound to a Filesystem instance.
 */
export function createReadFileTool(fs: Filesystem): ToolDefinition<{ path: string }> {
  return {
    name: 'read_file',
    description: 'Read the contents of a file at the specified path.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute or relative path to the file to read.' },
      },
      required: ['path'],
    },

    validate: validateReadInput,

    async execute(input): Promise<ToolResult> {
      try {
        validateReadInput(input);

        if (!fs.exists(input.path)) {
          return { content: `File not found: ${input.path}`, isError: true };
        }

        const fileStat = fs.stat(input.path);
        if (!fileStat.isFile) {
          return { content: `Not a file (is directory): ${input.path}`, isError: true };
        }

        const content = fs.readFile(input.path);

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
  };
}

/**
 * Create a write_file tool bound to a Filesystem instance.
 */
export function createWriteFileTool(
  fs: Filesystem,
): ToolDefinition<{ path: string; content: string }> {
  return {
    name: 'write_file',
    description:
      'Write content to a file at the specified path. Creates parent directories if needed.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute or relative path to the file to write.' },
        content: { type: 'string', description: 'Content to write to the file.' },
      },
      required: ['path', 'content'],
    },

    validate: validateWriteInput,

    async execute(input): Promise<ToolResult> {
      try {
        validateWriteInput(input);

        const contentStr = String(input.content);
        fs.writeFile(input.path, contentStr);

        return { content: `Successfully wrote ${contentStr.length} bytes to ${input.path}` };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: `Error writing file: ${message}`, isError: true };
      }
    },
  };
}

/**
 * Create a read_range tool bound to a Filesystem instance.
 * Reads a specific line range from a file — critical for large file inspection.
 */
export function createReadRangeTool(fs: Filesystem): ToolDefinition<{
  path: string;
  startLine: number;
  endLine: number;
}> {
  return {
    name: 'read_range',
    description:
      'Read a specific line range from a file. Useful for inspecting large files without reading them entirely.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to read.' },
        startLine: { type: 'number', description: 'First line to read (1-indexed, inclusive).' },
        endLine: { type: 'number', description: 'Last line to read (1-indexed, inclusive).' },
      },
      required: ['path', 'startLine', 'endLine'],
    },

    validate: validateReadRangeInput,

    async execute(input): Promise<ToolResult> {
      try {
        // Call standalone validator (NOT this.validate!)
        validateReadRangeInput(input);

        if (!fs.exists(input.path)) {
          return { content: `File not found: ${input.path}`, isError: true };
        }

        const fileStat = fs.stat(input.path);
        if (!fileStat.isFile) {
          return { content: `Not a file: ${input.path}`, isError: true };
        }

        const content = fs.readRange(input.path, input.startLine, input.endLine);
        const lineCount = content.split('\n').length;

        return {
          content: `Lines ${input.startLine}-${input.startLine + lineCount - 1} of ${input.path}:\n${content}`,
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: `Error reading range: ${message}`, isError: true };
      }
    },
  };
}

/**
 * Create a list_files tool bound to a Filesystem instance.
 * Lists directory contents — critical for directory exploration.
 */
export function createListFilesTool(fs: Filesystem): ToolDefinition<{
  path: string;
  recursive?: boolean;
}> {
  return {
    name: 'list_files',
    description:
      'List files and directories at the specified path. Set recursive to true for a full tree listing.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path to list.' },
        recursive: {
          type: 'boolean',
          description: 'If true, list files recursively. Defaults to false.',
        },
      },
      required: ['path'],
    },

    validate: validateListFilesInput,

    async execute(input): Promise<ToolResult> {
      try {
        // Call standalone validator (NOT this.validate!)
        validateListFilesInput(input);

        if (!fs.exists(input.path)) {
          return { content: `Directory not found: ${input.path}`, isError: true };
        }

        const dirStat = fs.stat(input.path);
        if (!dirStat.isDirectory) {
          return { content: `Not a directory: ${input.path}`, isError: true };
        }

        if (input.recursive) {
          // Consume async generator and collect file paths
          const fileRecords: { path: string }[] = [];
          for await (const entry of fs.walk(input.path)) {
            fileRecords.push({ path: entry.path });
          }

          const truncated = fileRecords.length > MAX_RESULT_LINES;
          const listing = fileRecords.slice(0, MAX_RESULT_LINES).map((e) => `📄 ${e.path}`);

          let output = `${input.path}/ (${fileRecords.length} files${truncated ? ', truncated' : ''}):\n`;
          output += listing.join('\n');

          return { content: output };
        }

        // Shallow listing via Domain contract
        const entries = fs.readdir(input.path);
        const dirs = entries.filter((e) => e.isDirectory).map((e) => `📁 ${e.name}/`);
        const files = entries.filter((e) => !e.isDirectory).map((e) => `📄 ${e.name}`);

        let output = `${input.path}/ (${dirs.length} dirs, ${files.length} files):\n`;
        output += [...dirs, ...files].join('\n');

        return { content: output };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: `Error listing files: ${message}`, isError: true };
      }
    },
  };
}
