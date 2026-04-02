/**
 * [LAYER: DOMAIN]
 * Principle: Define common contracts for execution hooks and plugins
 */

/**
 * Phases of the execution hook pipeline
 */
export enum HookPhase {
  /**
   * Before a tool is suggested to the user
   */
  PRE_TOOL_USE = 'pre_tool_use',

  /**
   * During tool execution lifecycle
   */
  TOOL_EXECUTION = 'tool_execution',

  /**
   * After tool execution completes
   */
  POST_EXECUTION = 'post_execution'
}

/**
 * Generic execution hook
 */
export interface Hook {
  /**
   * Unique name for the hook
   */
  name: string;

  /**
   * Execution phase for this hook
   */
  phase: HookPhase;

  /**
   * Priority (higher executes first)
   */
  priority: number;

  /**
   * Whether this hook should execute in the background without blocking the tool execution.
   */
  isBackground?: boolean;

  /**
   * The hook execution handler
   */
  execute: (params: { toolName: string; input: any; result?: any }) => Promise<any>;
}

/**
 * Result of a pre-tool execution check
 * Used to determine if the tool should be cancelled before it runs
 */
export interface PreToolCancellationProtocol {
  /**
   * True if the tool should be blocked
   */
  shouldCancel: boolean;

  /**
   * Reason for cancellation
   */
  reason?: string;
}
