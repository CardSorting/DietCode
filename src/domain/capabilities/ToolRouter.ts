/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic and contracts
 * Violations: None
 */

/**
 * Type for user intentions that need tool routing
 */
export type UserIntention = {
  operationType: string;
  target?: string;
  parameters?: Record<string, any>;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
};

/**
 * Tool definition matching a user intention
 */
export type ToolDefinition = {
  id: string;
  name: string;
  operationType: string;
  soloUseOnly: boolean;
  parallelizable: boolean;
  provenance: 'builtin' | 'custom';
};

/**
 * Routing result for a user intention
 */
export type ToolRoutingResult = {
  tool: ToolDefinition;
  matchesCriteria: boolean;
  overrideShell: boolean;
};

/**
 * Interface contract for tool routing
 * Pattern: "Tool routing: read={file-read}, edit={file-edit}, create={file-write}, exec={shell-execution}"
 */
export interface ToolRouter {
  /**
   * Route a user intention to the appropriate tool
   * Returns tool definition or throws error if no tool matches
   */
  route(intention: UserIntention): Promise<ToolRoutingResult>;

  /**
   * Check if a specific tool is available
   */
  hasTool(toolName: string): boolean;

  /**
   * Get all available tool names
   */
  getAllToolNames(): string[];
}

/**
 * Tool selection policy for determining parallelizability
 */
export interface ToolSelectionPolicy {
  canUseSolo(tool: ToolDefinition): boolean;
  canUseParallel(tool: ToolDefinition): boolean;
  getMaxParallelLimit(operationType: string): number;
}

/**
 * Parallel execution configuration
 */
export type ParallelConfig = {
  concurrent: boolean;
  limit: number;
  queue?: boolean;
};
