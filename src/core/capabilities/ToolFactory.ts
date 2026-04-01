/**
 * [LAYER: CORE]
 * Principle: Orchestration - implements Domain ToolFactory contract.
 * Delegates to Infrastructure adapters for actual construction.
 */

import type { ToolFactory, ToolDefinition, ToolResult } from '../../domain/agent/ToolFactory';
import type { SimpleToolExecutor } from '../../domain/agent/ToolExecutor';

/**
 * Default implementation of ToolFactory.
 * Safe construction with validation and error handling.
 */
export class DefaultToolFactory implements ToolFactory {
  /**
   * Create a tool instance with validation.
   * Pure factory operation with no side effects.
   */
  createTool<Input = any, Output = string>(config: {
    name: string;
    description: string;
    inputSchema: any;
    validate?: (input: Input) => void;
    execute: (input: Input) => Promise<ToolResult<Output>>;
  }): ToolDefinition<Input, Output> {
    // Validate input schema
    if (!config.name || typeof config.name !== 'string' || config.name.trim().length === 0) {
      throw new Error('Tool name is required and must be a non-empty string');
    }

    if (!config.description || typeof config.description !== 'string' || config.description.trim().length === 0) {
      throw new Error('Tool description is required and must be a non-empty string');
    }

    if (!config.inputSchema || typeof config.inputSchema !== 'object') {
      throw new Error('Tool inputSchema is required and must be an object');
    }

    if (config.inputSchema.type !== 'object') {
      throw new Error('Tool inputSchema type must be "object"');
    }

    if (!config.execute || typeof config.execute !== 'function') {
      throw new Error('Tool execute function is required');
    }

    // Return new tool definition
    const tool: ToolDefinition<Input, Output> = {
      name: config.name,
      description: config.description,
      inputSchema: config.inputSchema,
      validate: config.validate,
      async execute(input: Input) {
        // Validate if validate method exists
        if (config.validate) {
          try {
            config.validate(input);
          } catch (error) {
            if (error instanceof Error) {
              return {
                content: `Validation error: ${error.message}`,
                isError: true
              };
            }
            // Type assertion for unknown error
            return {
              content: `Validation error: ${String(error)}`,
              isError: true
            };
          }
        }

        // Execute tool
        try {
          const result = await config.execute(input);
          
          // If result is a ToolResult, return it
          if (result && typeof result === 'object' && 'content' in result) {
            return result as ToolResult<Output>;
          }
          
          // Fallback to string content
          return {
            content: String(result),
            isError: false
          };
        } catch (executionError: unknown) {
          return {
            content: `Execution error: ${executionError instanceof Error ? executionError.message : String(executionError)}`,
            isError: true
          };
        }
      }
    };

    return tool;
  }
}

/**
 * Factory that wraps existing SimpleToolExecutor instances.
 * Useful for refactoring existing tools to use new contracts.
 */
export class SimpleToolExecutorFactory implements ToolFactory {
  private executor: SimpleToolExecutor;

  constructor(executor: SimpleToolExecutor) {
    if (!executor) {
      throw new Error('SimpleToolExecutor is required');
    }
    
    this.executor = SimpleToolExecutorFactory.validateExecutor(executor);
  }

  createTool<Input = any, Output = string>(config: {
    name: string;
    description: string;
    inputSchema: any;
    validate?: (input: Input) => void;
    execute: (input: Input) => Promise<ToolResult<Output>>;
  }): ToolDefinition<Input, Output> {
    return this.executor.execute(config.name, this.executor.execute.bind(this.executor), config);
  }

  private static validateExecutor<TInput = any, TOutput = string>(
    executor: unknown
  ): SimpleToolExecutor<TInput, TOutput> {
    if (typeof executor !== 'object' || executor === null) {
      throw new Error('SimpleToolExecutor must be an object');
    }

    if (typeof (executor as SimpleToolExecutor).execute !== 'function') {
      throw new Error('SimpleToolExecutor.execute must be a function');
    }

    return executor as SimpleToolExecutor<TInput, TOutput>;
  }
}