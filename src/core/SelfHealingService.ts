/**
 * [LAYER: CORE]
 * Principle: Autonomous Recovery — manages the loop between integrity detection and refactoring.
 */

import { EventBus } from './EventBus';
import { EventType } from '../domain/Event';
import type { IntegrityReport, IntegrityViolation } from '../domain/memory/Integrity';
import { HealingStatus, type HealingProposal, type HealingTask } from '../domain/healing/Healing';
import { SovereignDb } from '../infrastructure/database/SovereignDb';
import type { HealingRepository } from '../domain/healing/HealingRepository';

export class SelfHealingService {
  private eventBus: EventBus = EventBus.getInstance();

  constructor(private repository: HealingRepository) {}

  /**
   * Triages an integrity report and enqueues healing tasks for critical violations.
   */
  async triage(report: IntegrityReport): Promise<number> {
    if (report.violations.length === 0) return 0;

    const queue = await SovereignDb.getQueue();
    let tasksEnqueued = 0;

    for (const violation of report.violations) {
      if (violation.severity === 'error') {
        const specialistId = this.assignSpecialist(violation);
        
        await queue.enqueue({
          type: 'CODE_HEAL',
          payload: {
            violationId: violation.id,
            violation,
            specialistId,
          }
        } as any);
        
        tasksEnqueued++;
        console.log(`[HEALING] Enqueued healing task for ${violation.type} on ${violation.file}`);
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
    
    console.log(`[HEALING] New proposal generated and persisted for violation: ${proposal.violationId}`);
    
    this.eventBus.emit(EventType.ERROR_OCCURRED, {
       source: 'SelfHealingService',
       type: 'proposal_generated',
       proposalId: proposal.id,
       violation: proposal.violation.message
    });
  }
}
