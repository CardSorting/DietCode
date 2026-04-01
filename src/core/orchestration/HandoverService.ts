/**
 * [LAYER: CORE]
 * Principle: Application orchestration — coordinates domain logic with infrastructure.
 * Uses structured logging for production-grade observability.
 */

import { EventBus } from './EventBus';
import { EventType } from '../../domain/Event';
import type { AgentRegistry } from '../capabilities/AgentRegistry';
import type { AgentId } from '../../domain/agent/Agent';
import type { SessionRepository } from '../../domain/context/SessionRepository';
import type { LogService } from '../../domain/logging/LogService';

export class HandoverService {
  private eventBus: EventBus = EventBus.getInstance();

  constructor(
    private agentRegistry: AgentRegistry,
    private repository: SessionRepository,
    private logService: LogService
  ) {}

  /**
   * Orchestrates the handover from one agent to another.
   */
  async handover(sessionId: string, fromAgentId: AgentId, toAgentId: AgentId, reason: string): Promise<void> {
    const toAgent = this.agentRegistry.getAgent(toAgentId);
    if (!toAgent) {
      this.logService.error(
        `Cannot handover to unknown agent: ${toAgentId}`,
        { sessionId, toAgentId },
        { component: 'HandoverService', fromAgentId }
      );
      throw new Error(`[CORE] Cannot handover to unknown agent: ${toAgentId}`);
    }

    this.eventBus.emit(EventType.RESPONSE_GENERATED, { 
      sessionId, 
      text: `[SYSTEM] Handing over session to specialized agent: ${toAgent.title}\nReason: ${reason}` 
    });

    this.logService.info(
      `Handover from ${fromAgentId} to ${toAgentId} requested`,
      { sessionId, fromAgentId, toAgentId, toAgentTitle: toAgent.title },
      { component: 'HandoverService' }
    );
    
    // Triple Down: Real State Migration
    await this.repository.updateSessionAgent(sessionId, toAgentId);
    
    this.eventBus.emit(EventType.SESSION_STARTED, { 
      sessionId, 
      agentId: toAgentId,
      handoverFrom: fromAgentId,
      reason 
    });

    this.logService.info(
      `Handover completed successfully for session ${sessionId}`,
      { sessionId, toAgentId },
      { component: 'HandoverService' }
    );
  }
}