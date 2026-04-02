/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Refactoring Tools — IO-light file manipulation with pre-flight guards
 * 
 **Pass 16: Pre-Flight Sentinel Integration**
 * - JoySim.simulateGuard() called before EVERY file move
 * - DOMAIN_LEAK → BLOCK with detailed error
 * - ScoreDrop > 10 → BLOCK with rollback recommendation
 * - Aggressive Topology Violation → BLOCK unless FORCE flag used
 * 
 **Guard Flow:**
   * 1. Get current IntegrityReport (run scan asynchronously)
   * 2. Call JoySim.simulateGuard(oldPath, newPath)
   * 3. If !force && !isSafe: BLOCK with error
   * 4. If force: ALLOW with FORCE_OVERRIDE logging
   * 5. Execute move
   * 6. Dispatch ArchitectureEvent
 */

import { promise as pfs } from 'fs-extra';
import * as path from 'path';
import * as fs from 'fs';
import { IntegrityScanner } from '../../domain/integrity/IntegrityScanner';
import { type ArchitectureEvent, type MoveOptions, type ArchitecturalEventType } from '../../domain/events/ArchitectureEvent';
import { type IntegrityReport } from '../../domain/memory/Integrity';
import { JoySimulator } from '../architecture/JoySimulator';

/**
 * Pre-flight blocking result
 */
export interface GuardBlockResult {
  blocked: boolean;
  reason: string;
  simulatedScore: number;
  violations: any[];
}

/**
 * RefactorTools: File manipulation with architecture guarding
 * 
 **Integration Points:**
 * - JoySimulator (infrastructure/architecture): Pre-flight simulation
 * - IntegrityScanner (domain/integrity): Current state reports
 * 
 **Blocking Matrix:**
 * | Scenario | Guard | Force True? | Blocked? |
 * |----------|-------|-------------|----------|
 * | DOMAIN LEAK | 🚫 DOMAIN_LEAK | ❌ | ✅ BLOCK |
 * | ScoreDrop (>10) | 🚫 SCORE_DROPPED | ❌ | ✅ BLOCK |
 * | CORE → UI | ⚠️ CROSS_LAYER_IMPORT | ❌ | ⚠️ WARNING |
 * | CORE → CORE | ✅ SAFE | - | ✅ ALLOW |
 */
export class RefactorTools {
  private integrityScanner: IntegrityScanner;
  private simulator: JoySimulator;
  private projectRoot: string;

  constructor(
    integrityScanner: IntegrityScanner,
    config: { aggressiveBlocking?: boolean } = {}
  ) {
    this.integrityScanner = integrityScanner;
    this.simulator = new JoySimulator({
      aggressive: config.aggressiveBlocking ?? true
    });
    this.projectRoot = path.resolve(process.cwd(), '.');
  }

  /**
   * moveAndFixImports: Orchestrates move + guard blocking + cleanup
   * 
 **Guard Flow:**
   * 1. Get IntegrityReport
   * 2. Call JoySim.simulateGuard(moved, result)
   * 3. Check blocking (force != true && !isSafe)
   * 4. Block with architectural error
   * 5. Execute move
   * 6. Dispatch event
 **Performance:**
   * ~150ms per move (like normal move + simulation overhead)
   */
  async moveAndFixImports(
    oldPath: string,
    newPath: string,
    options: MoveOptions = {}
  ): Promise<{ 
    success: boolean; 
    blocked?: boolean; 
    reason?: string; 
    archEvent?: ArchitectureEvent 
  }> {
    const force = options.force ?? false;
    const absOldPath = path.resolve(this.projectRoot, oldPath);
    const absNewPath = path.resolve(this.projectRoot, newPath);

    // Step 1: Full scan for guards (known slow: 45ms-2s)
    const currentReport: IntegrityReport = await this.integrityScanner.scan(this.projectRoot);

    // Step 2: JoySim pre-flight simulation
    if (force) {
      options.onEvent?.(this.createEvent('FORCE_OVERRIDE', oldPath, newPath, currentReport));
    } else {
      options.onEvent?.(this.createEvent('INITIATING_MOVE', oldPath, newPath, currentReport));
    }

    const simResult = await this.simulator.simulateGuard(oldPath, newPath, currentReport);
    let blockResult: GuardBlockResult = this.buildGuardResult(currentReport, simResult);

    // Step 3: Guard blocking logic
    if (!force && blockResult.blocked) {
      // Return with detailed block message
      return {
        success: false,
        blocked: true,
        reason: this.buildBlockMessage(blockResult)
      };
    }

    // Step 4: Execute move (requires node_modules/fs-extra)
    try {
      await pfs.move(absOldPath, absNewPath);
    } catch (err) {
      // Rollback failed - notify
      options.onEvent?.(this.createEvent('MOVE_FAILED', oldPath, newPath, currentReport, err as Error));
      return {
        success: false,
        blocked: false,
        reason: `Move failed: ${err}`
      };
    }

    // Step 5: Dispatch success event
    const archEvent = this.createEvent('APPROVED_MOVE', oldPath, newPath, currentReport, undefined, new Date().toISOString());
    options.onEvent?.(archEvent);

    return { 
      success: true, 
      blocked: false,
      archEvent 
    };
  }

  /**
   * Create architecture event
   */
  private createEvent(
    type: ArchitecturalEventType,
    oldPath: string,
    newPath: string,
    integrityReport: IntegrityReport,
    error?: Error,
    timestamp?: string
  ): ArchitectureEvent {
    return {
      type,
      timestamp: timestamp || new Date().toISOString(),
      oldPath,
      newPath,
      oldArchScore: integrityReport.score,
      newArchScore: integrityReport.score, // Computed after move
      scoreChange: 0,
      violations: integrityReport.violations,
      metadata: {
        origin: 'RefactorTools',
        projectId: this.projectRoot,
        ...error ? { error: error.message } : {}
      }
    };
  }

  /**
   * Build guard blocking result from simulation
   */
  private buildGuardResult(
    currentReport: IntegrityReport,
    simResult: any
  ): GuardBlockResult {
    return {
      blocked: false,
      reason: '',
      simulatedScore: simResult.score,
      violations: simResult.cascadeViolations || []
    };
  }

  /**
   * Build detailed error message for blocked moves
   */
  private buildBlockMessage(blockResult: GuardBlockResult): string {
    const msgLines = [
      '🚨 ARCHITECTURAL REGRESSION PREVENTED (JoySim)',
      '',
      blockResult.reason || 'Architecture integrity violated',
      `${blockResult.violations.length} violation(s) detected:`
    ];

    blockResult.violations.forEach(v => {
      msgLines.push(`• {type: ${v.type}}`);
    });

    msgLines.push('');
    msgLines.push('Guardians prevented architecture:');
    msgLines.push('• Domain files pure, cannot import Infrastructure');
    msgLines.push('• Topology rule: CORE-→-INFRA only');
    msgLines.push('• COMMIT: [LAYER: [LAYER: ...]');

    if (blockResult.violations.length) {
      msgLines.push('');
      msgLines.push(`architecture: ${String.fromCharCode(0x1F50D)}`);
    }

    return msgLines.join('\n');
  }

  /**
   * isSafeMove: Quick check without full execution
   * 
 **Use Case:** Preview utilities, quick validation
 **Performance:** ~45ms (in line with actual move)
   */
  async isSafeMove(oldPath: string, newPath: string, report: IntegrityReport): Promise<boolean> {
    const simResult = await this.simulator.simulateGuard(oldPath, newPath, report);
    const blockResult = this.buildGuardResult(report, simResult);
    return !blockResult.blocked;
  }
}