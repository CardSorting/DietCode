/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Adapters and integrations — implements Domain contracts
 * Violations: None
 */

import type { ActionCriteria, RiskEvaluator } from '../../domain/validation/RiskEvaluator';
import type { ApprovalRequirements } from '../../domain/validation/RiskLevel';
import { RiskLevel } from '../../domain/validation/RiskLevel';

/**
 * Infrastructure implementation of RiskEvaluator
 * Extracts safety patterns from prompt guidelines and implements checking logic
 */
export class SafetyEvaluator implements RiskEvaluator {
  /**
   * Evaluate risk level based on reversibility and system impact
   * Pattern from claude-code-prompts: "Actions that are local and reversible
   * — editing a file, running a test suite can proceed without hesitation.
   * Actions that are difficult to undo or affect shared systems require explicit user confirmation."
   */
  async evaluateRisk(criteria: ActionCriteria): Promise<RiskLevel> {
    // Determine reversibility
    const reversibility = this.determineReversibility(criteria);

    // Determine system impact
    const systemImpact = this.analyzeSystemImpact(criteria);

    // Determine affected area
    const affectedArea = this.determineAffectedArea(criteria);

    // Calculate risk tier
    if (reversibility === 'LOCAL' && systemImpact <= 4 && affectedArea === 'LOCAL') {
      return RiskLevel.SAFE;
    }
    if (reversibility === 'LOCAL' || (affectedArea === 'SHARED' && systemImpact <= 6)) {
      return RiskLevel.LOW;
    }
    if (reversibility === 'REMOTE' || affectedArea === 'EXTERNAL' || criteria.isDestructive) {
      return RiskLevel.HIGH;
    }
    return RiskLevel.MEDIUM;
  }

  /**
   * Check if an action requires explicit user approval
   */
  async requiresApproval(criteria: ActionCriteria): Promise<boolean> {
    const riskLevel = await this.evaluateRisk(criteria);

    // SAFE: No approval needed
    // LOW: Approval only if critical system affected
    // MEDIUM: Always requires approval
    // HIGH: Always requires approval
    if (riskLevel === RiskLevel.SAFE) {
      return false;
    }

    if (riskLevel === RiskLevel.LOW && !criteria.isCriticalSystem) {
      return false;
    }

    return true;
  }

  /**
   * Get approval requirements and suggested safeguards
   */
  async getApprovalRequirements(criteria: ActionCriteria): Promise<ApprovalRequirements> {
    const riskLevel = await this.evaluateRisk(criteria);

    const requirements: ApprovalRequirements = {
      requiresConfirmation: true,
      requiresRollback: false,
      requiresBackup: false,
      restrictions: [],
      recommendedSafeguards: [],
    };

    if (riskLevel === RiskLevel.SAFE) {
      return { ...requirements, requiresConfirmation: false };
    }

    if (riskLevel === RiskLevel.LOW) {
      requirements.requiresBackup = true;
      requirements.recommendedSafeguards.push('Test in isolation environment');
      return requirements;
    }

    if (riskLevel === RiskLevel.MEDIUM || criteria.isDestructive) {
      requirements.requiresRollback = true;
      requirements.requiresBackup = true;
      requirements.recommendedSafeguards.push('Create backup before proceeding');
      requirements.recommendedSafeguards.push('Test in isolation environment');
      requirements.recommendedSafeguards.push('Prepare rollback script');
    }

    if (riskLevel === RiskLevel.HIGH) {
      requirements.requiresRollback = true;
      requirements.requiresConfirmation = true; // Explicit confirmation required
      requirements.recommendedSafeguards.push('Create backup before proceeding');
      requirements.recommendedSafeguards.push('Test in isolation environment');
      requirements.recommendedSafeguards.push('Prepare rollback script');
      requirements.recommendedSafeguards.push('Review in detail before execution');
    }

    return requirements;
  }

  /**
   * Validate reversibility based on action type and target path
   */
  private determineReversibility(criteria: ActionCriteria): 'LOCAL' | 'REMOTE' | 'SYSTEM-WIDE' {
    const { actionType, targetPath } = criteria;

    // Local file edits are reversible
    if (actionType === 'file_edit' || actionType === 'file_write') {
      return 'LOCAL';
    }

    // File deletes are reversible (git)
    if (actionType === 'file_delete') {
      return 'REMOTE';
    }

    // Shell executions are often local
    if (actionType === 'shell_execute') {
      return 'LOCAL';
    }

    // Database and network operations affect remote systems
    if (actionType === 'database_query' || actionType === 'network_operation') {
      return 'REMOTE';
    }

    // Process control affects local system
    if (actionType === 'process_control') {
      return 'LOCAL';
    }

    // Git operations affect remote repository
    if (actionType === 'git_operation') {
      return 'REMOTE';
    }

    // User configuration affects system state
    if (actionType === 'user_configuration') {
      return 'SYSTEM-WIDE';
    }

    // Default to LOCAL
    return 'LOCAL';
  }

  /**
   * Analyze system impact based on action type and context
   */
  private analyzeSystemImpact(criteria: ActionCriteria): number {
    const { actionType, affectedUsers, isCriticalSystem } = criteria;

    // Critical system operations have highest impact
    if (isCriticalSystem) return 10;

    // Database operations affecting users
    if (actionType === 'database_query') return affectedUsers ?? 5;

    // Network operations
    if (actionType === 'network_operation') return 7;

    // Shell execution with destructive parameters
    if (actionType === 'shell_execute' && criteria.parameters?.includes('--force')) return 8;

    // Default moderate impact
    return 4;
  }

  /**
   * Determine affected area based on scope and users
   */
  private determineAffectedArea(
    criteria: ActionCriteria,
  ): 'LOCAL' | 'SHARED' | 'EXTERNAL' | 'USERS' {
    const { affectedUsers } = criteria;

    if (affectedUsers !== undefined && affectedUsers > 0) {
      return 'USERS';
    }

    // External dependencies
    if (criteria.parameters?.url) {
      return 'EXTERNAL';
    }

    // Shared state
    if (criteria.targetPath?.includes('/shared') || criteria.targetPath?.includes('/var')) {
      return 'SHARED';
    }

    // Default to LOCAL
    return 'LOCAL';
  }
}
