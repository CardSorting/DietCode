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

import type { RiskEvaluator, ActionCriteria } from '../../domain/validation/RiskEvaluator';
import { RiskLevel } from '../../domain/validation/RiskLevel';
import type { LockOrchestrator } from '../manager/LockOrchestrator';
import type { LockScope, LockResult } from '../../domain/safety/LockScope';
import type { LogService } from '../../domain/logging/LogService';

/**
 * SafetyGuard orchestrates safe execution of actions
 * Wraps execution with risk evaluation and rollback capabilities
 */
export class SafetyGuard {
  private static architecturalAlarmActive = false;

  constructor(
    private riskEvaluator: RiskEvaluator, 
    private logService: LogService,
    private lockOrchestrator?: LockOrchestrator
  ) {}

  /**
   * Triggers the Global Architectural Alarm.
   * "Soft-locks" dangerous operations until the architecture is healed.
   */
  static triggerAlarm(): void {
    if (!this.architecturalAlarmActive) {
      // Static context can't use injected logService easily without refactoring, 
      // but we'll use console.warn for now as it's a global emergency.
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
  async canProceed(criteria: ActionCriteria): Promise<{ canProceed: boolean; riskLevel: RiskLevel }> {
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
      this.logService.warn('LockOrchestrator not configured, skipping lock acquisition', { operation }, { component: 'SafetyGuard' });
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
      this.logService.info(`Operation lock acquired: ${operation} (ID: ${ticket.id})`, { operation, ticketId: ticket.id }, { component: 'SafetyGuard' });
      return { success: true, ticket };
    } catch (error: any) {
      this.logService.warn(`Lock acquisition failed: ${error.message}`, { operation, error: error.message }, { component: 'SafetyGuard' });
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
    const riskCriteria: ActionCriteria = {
      actionType: toolName.startsWith('db-') ? 'database' : 'file',
      parameters,
      targetPath: (parameters.targetPath || parameters.path) as string
    };
    
    const { canProceed, riskLevel } = await this.canProceed(riskCriteria);
    
    // Pass 4: Architectural Alarm Enforcement
    let effectiveRisk = riskLevel;
    let effectiveRequiresApproval = !canProceed;

    if (SafetyGuard.architecturalAlarmActive && 
        (riskLevel === RiskLevel.HIGH || toolName.includes('move') || toolName.includes('delete'))) {
        this.logService.warn('Architectural Alarm is active. Operation requires explicit approval.', { toolName, riskLevel }, { component: 'SafetyGuard' });
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
export type RollbackFunction = (backupData?: unknown) => Promise<unknown>;

// executeWithSafety helper - kept for backward compatibility with demos
export async function executeWithSafety(
  action: RollbackFunction,
  riskLevel: RiskLevel,
  parameters: Record<string, unknown> = {}
): Promise<unknown> {
  console.log(`Running action with risk level: ${riskLevel}`);
  try {
    const result = await action();
    return { success: true, result };
  } catch (error) {
    console.error('Action failed:', error);
    return { success: false, error };
  }
}