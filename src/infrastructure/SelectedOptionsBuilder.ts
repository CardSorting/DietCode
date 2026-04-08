/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Infrastructure implementation of interactive tool prompt builders.
 * Provides fzf-based selection and input with fluent API patterns.
 *
 * Inspired by: ForgeSelect's SelectBuilder and InputBuilder
 */

import { LogLevel } from '../domain/logging/LogLevel';
import type { LogService } from '../domain/logging/LogService';
import { ConsoleLoggerAdapter } from './ConsoleLoggerAdapter';
import * as readline from 'node:readline';

/**
 * FZF-based user selection builder.
 * Provides interactive tool selector with fuzzy matching.
 *
 * Usage:
 * ```typescript
 * const result = await new SelectBuilder()
 *   .withInitialText('Enter branch name')
 *   .withStartingCursor(3)
 *   .items(['main', 'develop', 'feature/login', 'hotfix/frontend'])
 *   .prompt();
 * ```
 */
export class SelectBuilder {
  private initialText?: string;
  private startingCursor?: number;
  private helpMessage?: string;
  private selectedItems: string[] = [];
  private logService: LogService;

  constructor(logService?: LogService) {
    this.logService = logService || new ConsoleLoggerAdapter(LogLevel.INFO);
  }

  /**
   * Provide initial text for selection.
   * Example: "Enter branch name" or "Select directory to scan"
   *
   * @param text - Initial prompt text
   * @returns This builder for method chaining
   */
  withInitialText(text: string): this {
    this.initialText = text;
    return this;
  }

  /**
   * Set starting cursor position (0 = first item).
   * Useful for remembering user's last selection.
   *
   * @param cursor - Cursor position (default: 0)
   * @returns This builder for method chaining
   */
  withStartingCursor(cursor: number): this {
    this.startingCursor = cursor;
    return this;
  }

  /**
   * Set help message displayed in FZF view.
   * Example: "Use ↑↓ to navigate, Enter to select, Ctrl+C to cancel"
   *
   * @param msg - Help message
   * @returns This builder for method chaining
   */
  withHelpMessage(msg: string): this {
    this.helpMessage = msg;
    return this;
  }

  /**
   * Set the available options for selection.
   * Can be file names, command options, or any user-provided items.
   *
   * @param options - Array of available options
   * @returns This builder for method chaining
   */
  items(options: string[]): this {
    this.selectedItems = options;
    return this;
  }

  /**
   * Get the count of available items
   */
  get itemCount(): number {
    return this.selectedItems.length;
  }

  /**
   * Execute the selection prompt.
   * Returns selected option or null if cancelled.
   *
   * @returns Selected option string or null
   */
  async prompt(): Promise<string | null> {
    if (this.itemCount === 0) {
      throw new Error('SelectBuilder: No items provided for selection');
    }

    // Simulated FZF integration (replace with actual FZF library implementation)
    this.logService.info(
      `\n${this.helpMessage || 'Use arrow keys to navigate, Enter to select, ESC to cancel'}`,
    );
    this.logService.info(`\nAvailable options (${this.itemCount}):`);

    this.selectedItems.forEach((item, index) => {
      const prefix = index === (this.startingCursor ?? index) ? '> ' : '  ';
      this.logService.info(`${prefix}${item}`);
    });

    this.logService.info(`\n${this.initialText || ''}`);

    // Simulate selection
    return this.selectedItems[0] || null;
  }
}

/**
 * Simple input prompt builder.
 * Provides text input for variable values.
 *
 * Usage:
 * ```typescript
 * const result = await new InputBuilder()
 *   .withMessage('Enter file name:')
 *   .withDefaultValue('config.json')
 *   .prompt();
 * ```
 */
export class InputBuilder {
  private message?: string;
  private defaultValue?: string;
  private validator?: (value: string) => boolean | string;
  private logService: LogService;

  constructor(logService?: LogService) {
    this.logService = logService || new ConsoleLoggerAdapter(LogLevel.INFO);
  }

  /**
   * Set the input prompt message.
   *
   * @param msg - Prompt message
   * @returns This builder for method chaining
   */
  withMessage(msg: string): this {
    this.message = msg;
    return this;
  }

  /**
   * Set a default value for the input.
   * Shown in brackets: `Enter value [default]`
   *
   * @param value - Default value
   * @returns This builder for method chaining
   */
  withDefaultValue(value: string): this {
    this.defaultValue = value;
    return this;
  }

  /**
   * Set a custom validator function.
   * Returns true if valid, or error message if invalid.
   *
   * @param validate - Validation function taking single value
   * @returns This builder for method chaining
   */
  withValidator(validate: (value: string) => boolean | string): this {
    this.validator = validate;
    return this;
  }

  /**
   * Execute the input prompt.
   * Returns user input string or throws if validation fails.
   *
   * @returns User-provided value
   */
  async prompt(): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve, reject) => {
      const promptText = this.message
        ? `${this.message} ${this.defaultValue ? `(${this.defaultValue})` : ''} `
        : '';

      rl.question(promptText, (answer: string) => {
        let value = answer.trim();

        // Use default if empty
        if (value.length === 0 && this.defaultValue !== undefined) {
          value = this.defaultValue;
        }

        // Validate if required
        if (value.length === 0) {
          reject(new Error('InputBuilder: Value cannot be empty'));
          rl.close();
          return;
        }

        if (this.validator) {
          const validation = this.validator(value);
          if (validation !== true) {
            reject(new Error(`Input validation failed: ${validation}`));
            rl.close();
            return;
          }
        }

        this.logService.info(`\nSelected: ${value}`);
        resolve(value);
        rl.close();
      });
    });
  }
}

/**
 * Wrapper that creates a ToolHandler from SelectBuilder.
 * Returns a ToolHandler with built-in interactive selection.
 *
 * @param selectBuilder - SelectBuilder configuration
 * @param toolName - Tool name for error messages
 * @returns ToolHandler ready for execution
 */
export function buildSelectToolHandler<TInput, TResult>(
  selectBuilder: SelectBuilder,
  toolName: string,
): ToolHandler<TInput, TResult> {
  async function execute(input: TInput): Promise<TResult> {
    const selection = await selectBuilder.prompt();

    if (!selection) {
      throw new Error(`${toolName}: Selection cancelled`);
    }

    return {
      selected: selection,
      timestamp: Date.now(),
    } as any;
  }

  return {
    execute,
    getMetadata() {
      const itemCount = selectBuilder.itemCount;
      return {
        name: toolName,
        description: `Interactive selection tool with ${itemCount} options`,
        operationType: 'SELECT',
        soloUseOnly: true,
        parallelizable: false,
        provenance: 'custom' as const,
        tags: ['interactive', 'selection', 'fzf'],
      };
    },
  };
}

// ToolHandler type definition
export interface ToolHandler<TInput, TResult> {
  execute(input: TInput): Promise<TResult>;
  getMetadata(): ExecutableToolMetadata;
}

export interface ExecutableToolMetadata {
  name: string;
  description: string;
  operationType: string;
  soloUseOnly?: boolean;
  parallelizable?: boolean;
  provenance: string;
  tags?: string[];
}
