/**
 * [LAYER: CORE]
 * Principle: Application orchestration — coordinates Domain and Infrastructure
 * Prework Status: 
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - [CONSOLIDATE] May benefit from RollbackProtocol integration
 */

import type { RiskEvaluator } from '../../domain/validation/RiskEvaluator';
import { RiskLevel } from '../../domain/validation/RiskLevel';
import type { SafetyAwareToolContext, SafetyAwareToolOptions } from '../../domain/capabilities/SafetyAwareToolExecution';

/**
 * SafetyGuard orchestrates safe execution of actions
 * Wraps execution with risk evaluation and rollback capabilities
 */
export class SafetyGuard {
  private riskEvaluator: RiskEvaluator;

  constructor(riskEvaluator: RiskEvaluator) {
    this.riskEvaluator = riskEvaluator;
  }

  /**
   * Check if action can proceed safely
   */
  async canProceed(criteria: any): Promise<{ canProceed: boolean; riskLevel: RiskLevel }> {
    const riskLevel = await this.riskEvaluator.evaluateRisk(criteria);
    const requirements = await this.riskEvaluator.getApprovalRequirements(criteria);
    
    const canProceed = !requirements.requiresConfirmation;
    
    return {
      canProceed,
      riskLevel
    };
  }

  /**
   * Get safety score (0-100) for an action
   * Higher is safer
   */
  getSafetyScore(riskLevel: RiskLevel): number {
    const scores = {
      [RiskLevel.SAFE]: 100,
      [RiskLevel.LOW]: 75,
      [RiskLevel.MEDIUM]: 50,
      [RiskLevel.HIGH]: 25
    };
    
    return scores[riskLevel];
  }

  /**
   * Convenience method: Convenience check for tool execution safety
   * Called by unified execution pipeline, not direct tool managers
   */
  async evaluateToolSafety(
    toolName: string,
    parameters: Record<string, any>
  ): Promise<{
    riskLevel: RiskLevel;
    requiresApproval: boolean;
    isSafe: boolean;
  }> {
    const riskCriteria = {
      operationType: toolName.startsWith('db-') ? 'database' : 'file',
      parameters,
      targetPath: parameters.targetPath || parameters.path
    };
    
    const { canProceed, riskLevel } = await this.canProceed(riskCriteria);
    
    return {
      riskLevel,
      requiresApproval: !canProceed,
      isSafe: canProceed
    };
  }
}