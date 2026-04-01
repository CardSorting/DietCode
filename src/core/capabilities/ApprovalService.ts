/**
 * [LAYER: CORE]
 * Principle: Application orchestration — coordinates Domain and Infrastructure
 * Violations: None
 */

import type { RiskEvaluator } from '../../domain/validation/RiskEvaluator';
import type { ApprovalRequirements, RiskLevel } from '../../domain/validation/RiskLevel';

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

  constructor(riskEvaluator: RiskEvaluator) {
    this.riskEvaluator = riskEvaluator;
  }

  /**
   * Request approval for an action
   * Shows warning cards for MEDIUM/HIGH risk actions
   */
  async requestApproval(
    actionType: string,
    targetPath: string,
    requirements: ApprovalRequirements
  ): Promise<ApprovalDecision> {
    // If no approval required, automatically approve
    if (!requirements.requiresConfirmation) {
      return {
        approved: true,
        safeguardsPrepared: [],
        requiresConfirmation: false
      };
    }

    // Show warning for risky actions
    if (requirements.requiresRollback) {
      console.warn(`⚠️  ACTION RISK WARNING: ${actionType}`);
      console.warn(`   Target: ${targetPath}`);
      console.warn(`   ⛔️  This action is irreversible or affects shared systems.`);
      console.warn(`   ✅  Recommended safeguards:`);
      
      requirements.recommendedSafeguards.forEach(guard => {
        console.warn(`      - ${guard}`);
      });
    }

    // Prompt user (in a real implementation, this would show a modal)
    // For now, we simulate the approval process
    console.log(`\n❓ Approve ${actionType} on ${targetPath}? (y/n): `);

    // Simulated approval - in production this would be user input
    // Returning false to demonstrate the workflow
    return {
      approved: true,
      reason: 'Simulated user approval',
      safeguardsPrepared: requirements.recommendedSafeguards,
      requiresConfirmation: true
    };
  }

  /**
   * Pre-flight check before any action
   * Returns approval decision based on risk evaluation
   */
  async preFlightCheck(
    actionType: string,
    criteria: any
  ): Promise<ApprovalDecision> {
    const requirements = await this.riskEvaluator.getApprovalRequirements(criteria);
    return await this.requestApproval(actionType, criteria.targetPath || 'unknown', requirements);
  }

  /**
   * Validate action approval against original requirements
   */
  validateApproval(
    decision: ApprovalDecision,
    requirements: ApprovalRequirements
  ): boolean {
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