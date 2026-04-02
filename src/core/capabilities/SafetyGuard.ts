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
import type { LockOrchestrator } from '../manager/LockOrchestrator';
import type { LockScope, LockResult } from '../../domain/safety/LockScope';

/**
 * SafetyGuard orchestrates safe execution of actions
 * Wraps execution with risk evaluation and rollback capabilities
 */
export class SafetyGuard {
  private riskEvaluator: RiskEvaluator;
  private lockOrchestrator?: LockOrchestrator;
  private static architecturalAlarmActive = false;

  constructor(riskEvaluator: RiskEvaluator, lockOrchestrator?: LockOrchestrator) {
    this.riskEvaluator = riskEvaluator;
    this.lockOrchestrator = lockOrchestrator;
  }

  /**
   * Triggers the Global Architectural Alarm.
   * "Soft-locks" dangerous operations until the architecture is healed.
   */
  static triggerAlarm(): void {
    if (!this.architecturalAlarmActive) {
      console.warn('🚨  [ARCHITECTURAL ALARM] System entering soft-lock due to integrity violations.');
      this.architecturalAlarmActive = true;
    }
  }

  /**
   * Clears the Global Architectural Alarm.
   */
  static clearAlarm(): void {
    if (this.architecturalAlarmActive) {
      console.log('💚  [ARCHITECTURAL ALARM] Alarm cleared. System integrity restored.');
      this.architecturalAlarmActive = false;
    }
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
   * Acquire lock for dangerous operation (Cline safety guard)
   */
  async acquireOperationLock(
    operation: string,
    timeoutMs: number = 30000
  ): Promise<LockResult> {
    if (!this.lockOrchestrator) {
      console.warn('⚠️  LockOrchestrator not configured, skipping lock acquisition');
      return { success: true };
    }

    const scope: LockScope = {
      taskId: 'system', // Default taskId for system-level operations
      operation,
      timeoutMs,
      autoRelease: true
    };

    try {
      const ticket = await this.lockOrchestrator.acquire(scope, timeoutMs);
      console.log(`🔒 Operation lock acquired: ${operation} (ID: ${ticket.id})`);
      return { success: true, ticket };
    } catch (error: any) {
      console.warn(`⚠️  Lock acquisition failed: ${error.message}`);
      return { 
        success: false, 
        error: error.message,
        reason: error.message.includes('timeout') ? 'timeout' : 'already_locked'
      };
    }
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
    
    // Pass 4: Architectural Alarm Enforcement
    let effectiveRisk = riskLevel;
    let effectiveRequiresApproval = !canProceed;

    if (SafetyGuard.architecturalAlarmActive && 
        (riskLevel === RiskLevel.HIGH || toolName.includes('move') || toolName.includes('delete'))) {
        console.warn('🚧  [SafetyGuard] Architectural Alarm is active. Operation requires explicit approval.');
        effectiveRisk = RiskLevel.HIGH;
        effectiveRequiresApproval = true;
    }

    return {
      riskLevel: effectiveRisk,
      requiresApproval: effectiveRequiresApproval,
      isSafe: !effectiveRequiresApproval
    };
  }
}

// Type definition for rollback parameter (increases testability)
export type RollbackFunction = (backupData?: any) => Promise<any>;

// executeWithSafety helper - kept for backward compatibility with demos
export async function executeWithSafety(
  action: RollbackFunction,
  riskLevel: RiskLevel,
  parameters: Record<string, any> = {}
): Promise<any> {
  console.log(`Running action with risk level: ${riskLevel}`);
  try {
    const result = await action();
    return { success: true, result };
  } catch (error) {
    console.error('Action failed:', error);
    return { success: false, error };
  }
}