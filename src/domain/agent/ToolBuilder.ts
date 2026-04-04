/**
 * [LAYER: DOMAIN]
 * Principle: Pure interfaces for building complex tools with configuration from execution.
 * Domain contracts that define builder patterns for tool construction, separating
 * configuration from runtime execution.
 *
 * Inspired by: ForgeSelect's SelectBuilder pattern
 * Violations: None
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - [FINALIZE] Builder interfaces for Domain-Infrastructure separation
 */
import type { ToolDefinition } from './ToolDefinition';
import type { ToolMetadata } from './ToolRegistry';

/**
 * Type-safe builder interface for constructing tools with predefined configuration.
 * Separates configuration complexity from runtime execution.
 */
export interface ToolBuilder<TInput, TResult> {
  /**
   * Configure the builder with validation and timeout settings.
   */
  configure(config: BuildConfig): void;

  /**
   * Build the final tool handler ready for execution.
   */
  build(): ToolHandler<TInput, TResult>;
}

/**
 * Configuration options for tool builders.
 * Controls validation, timeout, and retry behavior.
 */
export interface BuildConfig {
  /**
   * Whether to validate input/output schema before execution.
   * Enable for critical production operations.
   */
  validate: boolean;

  /**
   * Maximum execution time in milliseconds.
   * Defaults to 30 seconds.
   */
  timeout?: number;

  /**
   * Number of retry attempts on transient failures.
   * Defaults to 3.
   */
  retryOnFailure?: number;

  /**
   * Maximum total wait time for backoff retries.
   * Defaults to 5 minutes.
   */
  maxWaitTime?: number;
}

/**
 * Tool handler interface with execution capability and metadata.
 * Built from a ToolBuilder with full configuration applied.
 */
export interface ToolHandler<TInput, TResult> {
  /**
   * Execute the tool with provided input.
   */
  execute(input: TInput): Promise<TResult>;

  /**
   * Get metadata about the built tool execution context.
   */
  getMetadata(): ToolMetadata;
}

/**
 * Pre-built tool handler wrapper for convenience.
 * Used when configuration defaults are sufficient.
 */
export function buildToolHandler<TInput, TResult>(
  tool: ToolDefinition,
  config: BuildConfig = DEFAULT_BUILD_CONFIG,
): ToolHandler<TInput, TResult> {
  return {
    async execute(input: TInput): Promise<TResult> {
      // Default implementation - can be overridden per tool
      throw new Error(`Tool '${tool.name}' has no execute implementation`);
    },
    getMetadata() {
      return {
        name: tool.name,
        description: tool.description || '',
        operationType: 'GENERIC',
        soloUseOnly: false,
        parallelizable: true,
        provenance: 'custom' as const,
        tags: [],
      };
    },
  };
}

/**
 * Default build configuration for production operations.
 */
const DEFAULT_BUILD_CONFIG: BuildConfig = {
  validate: true,
  timeout: 30_000, // 30 seconds
  retryOnFailure: 3,
  maxWaitTime: 300_000, // 5 minutes
};
