/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic and types for tool definitions.
 * Zero external dependencies like zod (which belongs in Infrastructure/Core).
 */

export type ToolInputJSONSchema = {
  type: 'object';
  properties?: Record<string, any>;
  required?: string[];
  [key: string]: any;
};

export type ToolResult<T = string> = {
  content: T;
  isError?: boolean;
};

export interface ToolDefinition<Input = any, Output = string> {
  name: string;
  description: string;
  inputSchema: ToolInputJSONSchema;
  /**
   * Pure Domain-level validation.
   * Throws Domain-specific errors.
   */
  validate?(input: Input): void;
  execute(input: Input): Promise<ToolResult<Output>>;
}
