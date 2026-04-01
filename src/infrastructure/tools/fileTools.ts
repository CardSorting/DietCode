/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of basic file-related tools.
 * Uses the Domain Filesystem interface for operations.
 */

import { ToolDefinition, ToolResult } from '../../domain/ToolDefinition';
import { Filesystem } from '../../domain/Filesystem';

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
      const content = fs.readFile(path);
      return { content };
    } catch (e: any) {
      return { content: `Error reading file: ${e.message}`, isError: true };
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
      fs.writeFile(path, content);
      return { content: `Successfully wrote to ${path}` };
    } catch (e: any) {
      return { content: `Error writing file: ${e.message}`, isError: true };
    }
  },
});
