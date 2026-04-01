/**
 * [LAYER: CORE]
 * Principle: Manages the registration and execution of tools.
 * Coordinates between Domain definitions and Infrastructure implementations.
 */

import type { ToolDefinition, ToolResult } from '../domain/ToolDefinition';

export class ToolManager {
  private tools: Map<string, ToolDefinition> = new Map();

  registerTool(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  async executeTool(name: string, input: any): Promise<ToolResult> {
    const tool = this.getTool(name);
    if (!tool) {
      return {
        content: `Tool '${name}' not found.`,
        isError: true,
      };
    }

    try {
      return await tool.execute(input);
    } catch (error: any) {
      return {
        content: `Error executing tool '${name}': ${error.message}`,
        isError: true,
      };
    }
  }
}
