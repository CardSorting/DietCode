/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic and models
 * Violations: None
 */

/**
 * Risk level for system actions
 * Determines whether execution requires approval
 */
export enum RiskLevel {
  SAFE = 'SAFE', // Local, reversible, no system impact
  LOW = 'LOW', // Local but affects critical systems (tests, builds)
  MEDIUM = 'MEDIUM', // Hard to undo, affects shared state
  HIGH = 'HIGH', // Destructive, irreversible, or external-facing
}

/**
 * Classification of action types by risk characteristics
 */
export type ActionType =
  | 'file_edit'
  | 'file_write'
  | 'file_delete'
  | 'shell_execute'
  | 'database_query'
  | 'network_operation'
  | 'process_control'
  | 'git_operation'
  | 'user_configuration';

/**
 * Risk evaluation criteria
 */
export interface RiskCriteria {
  reversibility: 'LOCAL' | 'REMOTE' | 'SYSTEM-WIDE';
  systemImpact: number; // 0-10 scale
  affectedArea: 'LOCAL' | 'SHARED' | 'EXTERNAL' | 'USERS';
  requiresApproval: boolean;
}

/**
 * Validation rule for determining approval requirements
 */
export interface ApprovalRule {
  riskLevel: RiskLevel;
  requiresConfirmation: boolean;
  requiresRollback: boolean;
  restrictions: string[];
}

/**
 * Approval requirements definition
 * Used by RiskEvaluator for determining what approvals are needed for actions
 */
export interface ApprovalRequirements {
  requiresConfirmation: boolean;
  requiresRollback: boolean;
  requiresBackup: boolean;
  restrictions: string[];
  recommendedSafeguards: string[];
}
