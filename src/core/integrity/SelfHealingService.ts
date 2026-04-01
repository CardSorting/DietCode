/**
 * [LAYER: CORE]
 * Principle: Autonomous Recovery — manages the loop between integrity detection and refactoring.
 * Uses structured logging for production-grade observability.
 */

import { EventBus } from '../orchestration/EventBus';
import { EventType } from '../../domain/Event';
import type { IntegrityReport, IntegrityViolation } from '../../domain/memory/Integrity';
import { HealingStatus, type HealingProposal, type HealingTask } from '../../domain/healing/Healing';
import type { HealingRepository } from '../../domain/healing/HealingRepository';
import { JobType, type QueueProvider } from '../../domain/system/QueueProvider';
import type { SnapshotService } from '../memory/SnapshotService';
import type { VerificationProvider } from '../../domain/healing/VerificationProvider';
import type { LogService } from '../../domain/logging/LogService';

export class SelfHealingService {
  private eventBus: EventBus = EventBus.getInstance();

  constructor(
    private repository: HealingRepository,
    private queue: QueueProvider,
    private snapshotService: SnapshotService,
    private verificationProvider: VerificationProvider,
    private logService: LogService
  ) {}

  /**
   * Triages an integrity report and enqueues healing tasks for critical violations.
   */
  async triage(report: IntegrityReport): Promise<number> {
    if (report.violations.length === 0) return 0;

    let tasksEnqueued = 0;

    for (const violation of report.violations) {
      if (violation.severity === 'error') {
        const specialistId = this.assignSpecialist(violation);
        
        // Triple Down: Incremental Checkpointing via Snapshots
        const snapshotId = await this.snapshotService.takeSnapshot('system', {
          violationId: violation.id,
          stage: 'triage_completed',
          file: violation.file
        });

        await this.queue.enqueue({
          type: JobType.CODE_HEAL,
          payload: {
            violationId: violation.id,
            violation,
            specialistId,
            snapshotId
          }
        });
        
        tasksEnqueued++;
        this.logService.info(
          `Enqueued healing task for ${violation.type} on ${violation.file}`,
          { violationType: violation.type, file: violation.file },
          { component: 'SelfHealingService' }
        );
      }
    }

    return tasksEnqueued;
  }

  /**
   * Logic to assign the correct specialist agent to a violation.
   */
  private assignSpecialist(violation: IntegrityViolation): string {
    switch (violation.type) {
      case 'cross_layer_import':
      case 'unauthorized_io':
        return 'agent-architect';
      default:
        return 'agent-refactorer';
    }
  }

  /**
   * Records a healing proposal (usually called by the QueueWorker after LLM generation).
   */
  async recordProposal(proposal: HealingProposal): Promise<void> {
    await this.repository.saveProposal(proposal);
    
    this.logService.info(
      `New proposal generated and persisted for violation`,
      { violationId: proposal.violationId, proposalId: proposal.id },
      { component: 'SelfHealingService' }
    );
    
    this.eventBus.emit(EventType.ERROR_OCCURRED, {
       source: 'SelfHealingService',
       type: 'proposal_generated',
       proposalId: proposal.id,
       violation: proposal.violation.message
    });

    // Triple Down: Loop Closure — verify and close the violation
    const result = await this.verificationProvider.verifyResolution(proposal.violationId);
    if (result.isResolved) {
      this.logService.info(
        `Loop closed! Violation verified as resolved`,
        { violationId: proposal.violationId },
        { component: 'SelfHealingService' }
      );
      await this.repository.updateProposalStatus(proposal.id, 'applied');
    } else {
      this.logService.warn(
        `Refactor applied but violation persists`,
        { violationId: proposal.violationId },
        { component: 'SelfHealingService' }
      );
    }
  }
}
