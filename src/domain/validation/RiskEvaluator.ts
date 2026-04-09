/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic and types — testable in isolation
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - None
 */

import type { ApprovalRequirements, RiskLevel } from './RiskLevel';

/**
 * Interface contract for evaluating risk levels of system actions
 * Contains pure business logic for determining whether an action is safe
 */
export interface RiskEvaluator {
  /**
   * Evaluate the risk level for a given action
   * Returns the appropriate risk tier based on reversibility and system impact
   */
  evaluateRisk(criteria: ActionCriteria): Promise<RiskLevel>;

  /**
   * Check if an action requires explicit user approval
   * Based on risk level and user permission tier
   */
  requiresApproval(criteria: ActionCriteria): Promise<boolean>;

  /**
   * Get approval requirements for a specific action
   * Returns rules about what approvals are needed and what safeguards to prepare
   */
  getApprovalRequirements(criteria: ActionCriteria): Promise<ApprovalRequirements>;
}

/**
 * Action criteria for risk evaluation
 */
export interface ActionCriteria {
  actionType: string;
  targetPath?: string;
  parameters?: Record<string, any>;
  affectedUsers?: number;
  isCriticalSystem?: boolean;
  isDestructive?: boolean;
}
