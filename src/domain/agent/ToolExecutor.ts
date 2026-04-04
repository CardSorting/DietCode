/**
 * [LAYER: DOMAIN]
 * Principle: Pure execution contracts - tool invocation boundaries.
 * Zero external dependencies or I/O operations.
 */

import type { ToolDefinition, ToolResult } from './ToolDefinition';

/**
 * Execution context containing safety and metadata.
 * Pure domain-level data structure.
 */
export type ToolExecutionContext = {
  correlationId: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Execution result with safety information.
 * Pure domain-level data structure.
 */
export type ToolExecutionResult<T = string> = {
  toolName: string;
  success: boolean;
  result: ToolResult<T>;
  executionTime: number;
  safetyCheck?: SafetyCheckResult;
  error?: string;
} & ToolExecutionContext;

/**
 * Safety evaluation result.
 * Pure domain-level data structure.
 */
export type SafetyCheckResult = {
  evaluated: boolean;
  riskLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH';
  approved: boolean;
  requiresConfirmation: boolean;
  rollbackPrepared: boolean;
  safeguardsApplied: string[];
};

/**
 * Forward execution contract.
 * Pure domain contract for tool invocation.
 */
export interface ToolExecutor<TInput = any, TOutput = string> {
  /**
   * Execute a tool with full context and safety information.
   * Pure domain-level operation - no I/O, pure orchestration.
   */
  execute(
    tool: ToolDefinition<TInput, TOutput>,
    input: TInput,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult<TOutput>>;
}

/**
 * Batch execution contract for parallel operations.
 * Pure domain-level operation.
 */
export interface BatchToolExecutor {
  /**
   * Execute multiple tools in parallel or batch.
   * Pattern: "Purpose-built tools give user better visibility, make review easier"
   */
  executeBatch(
    requests: {
      tool: ToolDefinition;
      input: any;
      context: ToolExecutionContext;
    }[],
    options: {
      maxConcurrent?: number;
      enableParallel?: boolean;
    },
  ): Promise<ToolExecutionResult<string>[]>;
}

/**
 * Simple execution contract (legacy support).
 * Used for backward compatibility.
 */
export interface SimpleToolExecutor<TInput = any, TOutput = string> {
  /**
   * Execute a tool with basic safety checks.
   * Simplified version for tools that don't need full context.
   */
  execute(tool: ToolDefinition<TInput, TOutput>, input: TInput): Promise<ToolResult<TOutput>>;
}

/**
 * Type guard for checking if a value implements ToolExecutor.
 */
export function isToolExecutor(value: unknown, inputType?: any): value is ToolExecutor {
  if (typeof value !== 'object' || value === null) return false;

  return 'execute' in value && typeof (value as ToolExecutor).execute === 'function';
}

/**
 * Type guard for checking if a value implements SimpleToolExecutor.
 */
export function isSimpleToolExecutor<TInput = any, TOutput = string>(
  value: unknown,
): value is SimpleToolExecutor<TInput, TOutput> {
  if (typeof value !== 'object' || value === null) return false;

  return (
    'execute' in value &&
    typeof (value as SimpleToolExecutor<TInput, TOutput>).execute === 'function'
  );
}
