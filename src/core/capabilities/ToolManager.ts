/**
 * [LAYER: CORE]
 * Principle: Manages the registration and execution of tools.
 * Coordinates between Domain definitions and Infrastructure implementations.
 */

import type { ToolDefinition, ToolResult } from '../../domain/agent/ToolDefinition';
import { EventBus } from '../orchestration/EventBus';
import { EventType } from '../../domain/Event';

export class ToolManager {
  private tools: Map<string, ToolDefinition> = new Map();
  private eventBus: EventBus = EventBus.getInstance();

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
      this.eventBus.emit(EventType.TOOL_FAILED, { name, error: 'Tool not found' });
      return {
        content: `Tool '${name}' not found.`,
        isError: true,
      };
    }

    const startTime = Date.now();
    this.eventBus.emit(EventType.TOOL_INVOKED, { name, input });

    try {
      const result = await tool.execute(input);
      const durationMs = Date.now() - startTime;
      
      if (result.isError) {
        this.eventBus.emit(EventType.TOOL_FAILED, { name, error: result.content }, { durationMs });
      } else {
        this.eventBus.emit(EventType.TOOL_COMPLETED, { name }, { durationMs });
      }
      
      return result;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      this.eventBus.emit(EventType.TOOL_FAILED, { name, error: error.message }, { durationMs });
      return {
        content: `Error executing tool '${name}': ${error.message}`,
        isError: true,
      };
    }
  }
}
