/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic and factory contracts.
 * Zero external dependencies like zod or Node.js APIs.
 */

import type { ToolDefinition, ToolResult } from './ToolDefinition';

/**
 * Factory contract for constructing tool instances.
 * Pure domain-level operation - no I/O, no side effects.
 */
export interface ToolFactory<Input = any, Output = string> {
  /**
   * Create a new tool instance.
   * Pure factory operation with no side effects.
   */
  createTool(config: {
    name: string;
    description: string;
    inputSchema: any;
    validate?: (input: Input) => void;
    execute: (input: Input) => Promise<ToolResult<Output>>;
  }): ToolDefinition<Input, Output>;
}

/**
 * Type guard for checking if a value is a valid tool factory.
 */
export function isToolFactory(value: unknown): value is ToolFactory {
  return (
    typeof value === 'object' &&
    value !== null &&
    'createTool' in value &&
    typeof (value as ToolFactory).createTool === 'function'
  );
}