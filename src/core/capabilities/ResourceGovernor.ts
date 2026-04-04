/**
 * [LAYER: CORE]
 * Principle: Algorithmic Governance — prevents runaway loops and excessive resource usage.
 * Implementation: Metrics-based threshold enforcement.
 */

export enum GovernanceAction {
  PROCEED = 'PROCEED',
  PAUSE = 'PAUSE',
  BLOCK = 'BLOCK',
}

export interface GovernanceResult {
  action: GovernanceAction;
  reason?: string;
  metrics: {
    toolCallCount: number;
    consecutiveFailures: number;
    totalDurationMs: number;
  };
}

export interface GovernorConfig {
  maxToolCalls: number;
  pauseThreshold: number;
  maxConsecutiveFailures: number;
  maxTotalDurationMs: number;
}

export class ResourceGovernor {
  private metrics = {
    toolCallCount: 0,
    consecutiveFailures: 0,
    totalDurationMs: 0,
  };

  private config: GovernorConfig;

  constructor(config?: Partial<GovernorConfig>) {
    this.config = {
      maxToolCalls: config?.maxToolCalls ?? 50,
      pauseThreshold: config?.pauseThreshold ?? 20,
      maxConsecutiveFailures: config?.maxConsecutiveFailures ?? 3,
      maxTotalDurationMs: config?.maxTotalDurationMs ?? 300000, // 5 minutes
    };
  }

  /**
   * Evaluates whether a tool execution should proceed.
   */
  shouldProceed(toolName: string): GovernanceResult {
    // 1. Check for absolute block on tool calls
    if (this.metrics.toolCallCount >= this.config.maxToolCalls) {
      return this.createResult(
        GovernanceAction.BLOCK,
        `Maximum tool call limit reached (${this.config.maxToolCalls})`,
      );
    }

    // 2. Check for consecutive failures (loop detection)
    if (this.metrics.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      return this.createResult(
        GovernanceAction.BLOCK,
        `Too many consecutive failures (${this.metrics.consecutiveFailures}). Potential loop detected.`,
      );
    }

    // 3. Check for total duration limit
    if (this.metrics.totalDurationMs >= this.config.maxTotalDurationMs) {
      return this.createResult(
        GovernanceAction.BLOCK,
        `Total execution duration limit reached (${this.metrics.totalDurationMs}ms)`,
      );
    }

    // 4. Check for pause threshold (requires user confirmation)
    if (this.metrics.toolCallCount >= this.config.pauseThreshold) {
      return this.createResult(
        GovernanceAction.PAUSE,
        `Pause threshold reached (${this.metrics.toolCallCount} calls). Requesting user confirmation.`,
      );
    }

    return this.createResult(GovernanceAction.PROCEED);
  }

  /**
   * Records a tool invocation.
   */
  recordInvocation(toolName: string): void {
    this.metrics.toolCallCount++;
  }

  /**
   * Records a tool completion result.
   */
  recordResult(toolName: string, success: boolean, durationMs: number): void {
    this.metrics.totalDurationMs += durationMs;
    if (success) {
      this.metrics.consecutiveFailures = 0;
    } else {
      this.metrics.consecutiveFailures++;
    }
  }

  private createResult(action: GovernanceAction, reason?: string): GovernanceResult {
    return {
      action,
      reason,
      metrics: { ...this.metrics },
    };
  }

  getMetrics() {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      toolCallCount: 0,
      consecutiveFailures: 0,
      totalDurationMs: 0,
    };
  }
}
