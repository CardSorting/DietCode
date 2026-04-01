/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of the mkdir tool.
 * Uses the Domain Filesystem interface.
 */

import type { ToolDefinition, ToolResult } from '../../domain/agent/ToolDefinition';
import type { Filesystem } from '../../domain/system/Filesystem';

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
      fs.mkdir(path);
      return { content: `Successfully created directory: ${path}` };
    } catch (error: any) {
      return {
        content: `Error creating directory: ${error.message}`,
        isError: true,
      };
    }
  },
});
