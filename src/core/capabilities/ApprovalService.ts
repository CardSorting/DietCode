/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: Application orchestration — coordinates Domain and Infrastructure
 * Violations: None
 */

import type { RiskEvaluator } from '../../domain/validation/RiskEvaluator';
import type { ApprovalRequirements, RiskLevel } from '../../domain/validation/RiskLevel';
import { UIBridge } from '../../ui/provider/UIBridge';

/**
 * Approval decision for an action
 */
export interface ApprovalDecision {
  approved: boolean;
  reason?: string;
  safeguardsPrepared: string[];
  requiresConfirmation: boolean;
}

/**
 * Service that handles approval workflows for risky actions
 * Orchestrates the approval process between user and system
 */
export class ApprovalService {
  private riskEvaluator: RiskEvaluator;
  private bridge: UIBridge;

  constructor(riskEvaluator: RiskEvaluator) {
    this.riskEvaluator = riskEvaluator;
    this.bridge = UIBridge.getInstance();
  }

  /**
   * Request approval for an action
   * Shows warning cards for MEDIUM/HIGH risk actions
   */
  async requestApproval(
    actionType: string,
    targetPath: string,
    requirements: ApprovalRequirements,
  ): Promise<ApprovalDecision> {
    // If no approval required, automatically approve
    if (!requirements.requiresConfirmation) {
      return {
        approved: true,
        safeguardsPrepared: [],
        requiresConfirmation: false,
      };
    }

    // Show warning for risky actions in console (CLI observability)
    if (requirements.requiresRollback) {
      console.warn(`⚠️  ACTION RISK WARNING: ${actionType}`);
      console.warn(`   Target: ${targetPath}`);
    }

    // Real implementation: Request approval via UIBridge (Webview)
    const approved = await this.bridge.requestUserApproval(
        `approval-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        { actionType, targetPath, requirements }
    );

    return {
      approved,
      reason: approved ? 'User approved via Sovereign UI' : 'User rejected via Sovereign UI',
      safeguardsPrepared: approved ? requirements.recommendedSafeguards : [],
      requiresConfirmation: true,
    };
  }

  /**
   * Pre-flight check before any action
   * Returns approval decision based on risk evaluation
   */
  async preFlightCheck(
    actionType: string,
    criteria: Parameters<RiskEvaluator['getApprovalRequirements']>[0],
  ): Promise<ApprovalDecision> {
    const requirements = await this.riskEvaluator.getApprovalRequirements(criteria);
    return await this.requestApproval(actionType, criteria.targetPath || 'unknown', requirements);
  }

  /**
   * Validate action approval against original requirements
   */
  validateApproval(decision: ApprovalDecision, requirements: ApprovalRequirements): boolean {
    if (!decision.approved) {
      return false;
    }

    if (requirements.requiresRollback && decision.safeguardsPrepared.length === 0) {
      console.warn('⚠️  Approval granted but no safeguards prepared for rollback');
      return false;
    }

    return true;
  }
}
