/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Refactor Tools — High-level Facade for architecture-guarded file moves.
 * Pass 18: Separation of Concerns (Refactor Decoupling).
 */

import * as path from 'path';
import { IntegrityScanner } from '../../domain/integrity/IntegrityScanner';
import { type ArchitectureEvent, type MoveOptions } from '../../domain/events/ArchitectureEvent';
import { type IntegrityReport } from '../../domain/memory/Integrity';
import { JoySimulator } from '../architecture/JoySimulator';

// Sub-Services (Pass 18)
import { RefactorMoveEngine } from './refactor/RefactorMoveEngine';
import { RefactorTagSentinel } from './refactor/RefactorTagSentinel';
import { RefactorHealer } from './refactor/RefactorHealer';
import { RefactorEventFactory } from './refactor/RefactorEventFactory';

// Sovereign Infrastructure (Pass 18 Hardening)
import { SovereignDb } from '../database/SovereignDb';
import { BroccoliQueueAdapter } from '../queue/BroccoliQueueAdapter';
import { JobType } from '../../domain/system/QueueProvider';

export interface GuardBlockResult {
  blocked: boolean;
  reason: string;
  simulatedScore: number;
  violations: any[];
}

/**
 * RefactorTools: The 'Silent Sentinel' Orchestrator.
 * Delegates work to specialized Move, Tag, Heal, and Event services.
 */
export class RefactorTools {
  private projectRoot: string;
  private simulator: JoySimulator;
  
  private moveEngine: RefactorMoveEngine;
  private tagSentinel: RefactorTagSentinel;
  private healer: RefactorHealer;
  private eventFactory: RefactorEventFactory;
  
  // Persistence (Pass 18 Hardening)
  private queueAdapter = new BroccoliQueueAdapter();

  constructor(
    private integrityScanner: IntegrityScanner,
    config: { aggressiveBlocking?: boolean } = {}
  ) {
    this.projectRoot = path.resolve(process.cwd(), '.');
    this.simulator = new JoySimulator({ aggressive: config.aggressiveBlocking ?? true });
    
    // Injecting Sub-Services
    this.moveEngine = new RefactorMoveEngine(this.projectRoot);
    this.tagSentinel = new RefactorTagSentinel(this.projectRoot);
    this.healer = new RefactorHealer(this.projectRoot);
    this.eventFactory = new RefactorEventFactory(this.projectRoot);
  }

  /**
   * moveAndFixImports: High-throughput move with deferred healing.
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

    // Step 1: Pre-flight Intelligence
    const currentReport = await this.integrityScanner.scan(this.projectRoot);
    const simResult = await this.simulator.simulateGuard(oldPath, newPath, currentReport);
    
    // Step 2: Guard Policy Enforcement
    let blockResult = this.buildGuardResult(simResult);
    
    // JoyZoning Special Case: JOY_ZONING_GUIDE.md First-Pass Bypass
    const isJoyZoningFile = oldPath.endsWith('JOY_ZONING_GUIDE.md') || newPath.endsWith('JOY_ZONING_GUIDE.md');
    
    // Check persistent database for prior bypasses (Pass 18 Hardening)
    const alreadyBypassed = await SovereignDb.isBypassed(oldPath);

    if (!force && blockResult.blocked && isJoyZoningFile && !alreadyBypassed) {
      console.log(`⚠️  JOYZONING BYPASS (PERSISTED): Allowing first-pass regression for ${oldPath}`);
      
      // Persist the bypass event to ensure policy enforcement holds across restarts
      await SovereignDb.recordBypass(oldPath, blockResult.violations[0]?.type || 'UNKNOWN');

      blockResult.blocked = false; // Override block for this pass
      
      // Flag and Queue for Self-Healing
      await this.queueAdapter.enqueue({
        type: JobType.JOY_ZONING_HEAL,
        payload: {
          path: newPath, 
          violations: blockResult.violations,
          suggestedPath: simResult.violations?.[0]?.suggestedPath
        }
      });
    }

    if (!force && blockResult.blocked) {
      return { success: false, blocked: true, reason: this.buildBlockMessage(blockResult) };
    }

    try {
      // Step 3: Atomic Physical Move
      await this.moveEngine.move(oldPath, newPath);

      // Step 4: Sovereign Tag Alignment
      await this.tagSentinel.updateTags(newPath);

      // Step 5: Resolve Imports (Broccoli Flow)
      await this.healer.resolveImports(
        oldPath, 
        newPath, 
        !!simResult.requiresHealing,
        simResult.violations?.[0]?.suggestedPath
      );

    } catch (err) {
      const failEvent = this.eventFactory.createEvent('MOVE_FAILED', oldPath, newPath, currentReport, err as Error);
      options.onEvent?.(failEvent);
      return { success: false, blocked: false, reason: `Move failed: ${err}` };
    }

    // Step 6: Dispatch Success Event
    const archEvent = this.eventFactory.createEvent('APPROVED_MOVE', oldPath, newPath, currentReport);
    options.onEvent?.(archEvent);

    return { success: true, blocked: false, archEvent };
  }

  private buildGuardResult(simResult: any): GuardBlockResult {
    return {
      blocked: simResult.isSafe === false,
      reason: simResult.violations?.[0]?.message || '',
      simulatedScore: simResult.score,
      violations: [...(simResult.violations || []), ...(simResult.cascadeViolations || [])]
    };
  }

  private buildBlockMessage(blockResult: GuardBlockResult): string {
    return `🚨 ARCHITECTURAL REGRESSION PREVENTED\n\n${blockResult.reason}\n${blockResult.violations.length} violation(s) detected.`;
  }
}