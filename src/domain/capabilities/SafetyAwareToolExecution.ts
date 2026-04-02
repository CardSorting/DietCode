/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic and contracts
 * Violations: None
 */

import { RiskLevel } from '../validation/RiskLevel';

/**
 * Context for tool execution that includes safety information
 * Pattern: Safety envelope around tool execution
 */
export type SafetyAwareToolContext = {
  success: boolean;
  toolName: string;
  toolResult?: any;
  safetyCheck: {
    evaluated: boolean;
    riskLevel: RiskLevel;
    approved: boolean;
    requiresConfirmation: boolean;
    rollbackPrepared: boolean;
    safeguardsApplied: string[];
  };
  execution: {
    startTime: number;
    endTime: number;
    durationMs: number;
  };
}

/**
 * Options for safety-aware tool execution
 */
export type SafetyAwareToolOptions = {
  toolName?: string;
  input?: any;
  requireApprovalForHighRisk?: boolean;
  backupBeforeModification?: boolean;
  enforceParallelSafety?: boolean;
  targetPath?: string;
}

/**
 * Safety-aware tool execution contract
 * Pattern: Shared interface between Core (ToolManager) and Core (SafetyGuard)
 */
export interface SafetyAwareToolExecutor {
  /**
   * Execute a tool with safety checks wrapped around its execution
   * Pattern: SafetyGuard protects every tool invocation
   */
  executeWithSafety(
    toolName: string,
    parameters: Record<string, any>,
    options?: SafetyAwareToolOptions
  ): Promise<SafetyAwareToolContext>;
}