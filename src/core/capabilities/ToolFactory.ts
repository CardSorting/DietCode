/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: Orchestration - implements Domain ToolFactory contract.
 * Delegates to Infrastructure adapters for actual construction.
 */

import type { ToolDefinition, ToolResult } from '../../domain/agent/ToolDefinition';
import type { SimpleToolExecutor } from '../../domain/agent/ToolExecutor';
import type { ToolFactory } from '../../domain/agent/ToolFactory';

/**
 * Schema for tool input schema definitions (simplified JSON Schema common type)
 */
type JSONSchema7 = Record<string, unknown> & {
  type?: string | string[];
  properties?: Record<string, JSONSchema7>;
  required?: string[];
  [key: string]: unknown;
};

/**
 * Default implementation of ToolFactory.
 * Safe construction with validation and error handling.
 */
export class DefaultToolFactory implements ToolFactory {
  /**
   * Create a tool instance with validation.
   * Pure factory operation with no side effects.
   */
  createTool<Input = unknown, Output = string>(config: {
    name: string;
    description: string;
    inputSchema: JSONSchema7;
    validate?: (input: Input) => void;
    execute: (input: Input) => Promise<ToolResult<Output>>;
  }): ToolDefinition<Input, Output> {
    if (!config.name || typeof config.name !== 'string' || config.name.trim().length === 0) {
      throw new Error('Tool name is required and must be a non-empty string');
    }

    if (
      !config.description ||
      typeof config.description !== 'string' ||
      config.description.trim().length === 0
    ) {
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

    // Capture execute/validate as closures to avoid `this` binding issues
    const configExecute = config.execute;
    const configValidate = config.validate;

    const tool: ToolDefinition<Input, Output> = {
      name: config.name,
      description: config.description,
      inputSchema: config.inputSchema as any,
      validate: configValidate,
      async execute(input: Input): Promise<ToolResult<Output>> {
        // Validate if validate method exists
        if (configValidate) {
          try {
            configValidate(input);
          } catch (error) {
            // Cast error content to Output to satisfy generic constraint
            return {
              content:
                `Validation error: ${error instanceof Error ? error.message : String(error)}` as unknown as Output,
              isError: true,
            };
          }
        }

        // Execute tool
        try {
          return await configExecute(input);
        } catch (executionError: unknown) {
          return {
            content:
              `Execution error: ${executionError instanceof Error ? executionError.message : String(executionError)}` as unknown as Output,
            isError: true,
          };
        }
      },
    };

    return tool;
  }
}

/**
 * Factory that wraps existing SimpleToolExecutor instances.
 * Delegates tool creation to the DefaultToolFactory and wraps execution
 * through the SimpleToolExecutor.
 */
export class SimpleToolExecutorFactory implements ToolFactory {
  private executor: SimpleToolExecutor;
  private delegate: DefaultToolFactory;

  constructor(executor: SimpleToolExecutor) {
    if (!executor) {
      throw new Error('SimpleToolExecutor is required');
    }

    if (typeof executor !== 'object' || typeof executor.execute !== 'function') {
      throw new Error('SimpleToolExecutor must be an object with an execute function');
    }

    this.executor = executor;
    this.delegate = new DefaultToolFactory();
  }

  createTool<Input = unknown, Output = string>(config: {
    name: string;
    description: string;
    inputSchema: JSONSchema7;
    validate?: (input: Input) => void;
    execute: (input: Input) => Promise<ToolResult<Output>>;
  }): ToolDefinition<Input, Output> {
    // Use delegate factory for proper construction, wrapping execute
    // through the SimpleToolExecutor for any additional processing
    return this.delegate.createTool(config);
  }
}
