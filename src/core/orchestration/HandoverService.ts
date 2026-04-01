import { EventBus } from './EventBus';
import { EventType } from '../../domain/Event';
import type { AgentRegistry } from '../capabilities/AgentRegistry';
import type { AgentId } from '../../domain/agent/Agent';
import type { SessionRepository } from '../../domain/context/SessionRepository';

export class HandoverService {
  private eventBus: EventBus = EventBus.getInstance();

  constructor(
    private agentRegistry: AgentRegistry,
    private repository: SessionRepository
  ) {}

  /**
   * Orchestrates the handover from one agent to another.
   */
  async handover(sessionId: string, fromAgentId: AgentId, toAgentId: AgentId, reason: string): Promise<void> {
    const toAgent = this.agentRegistry.getAgent(toAgentId);
    if (!toAgent) {
      throw new Error(`[CORE] Cannot handover to unknown agent: ${toAgentId}`);
    }

    this.eventBus.emit(EventType.RESPONSE_GENERATED, { 
      sessionId, 
      text: `[SYSTEM] Handing over session to specialized agent: ${toAgent.title}\nReason: ${reason}` 
    });

    console.log(`[SWARM] Handover from ${fromAgentId} to ${toAgentId} requested.`);
    
    // Triple Down: Real State Migration
    await this.repository.updateSessionAgent(sessionId, toAgentId);
    
    this.eventBus.emit(EventType.SESSION_STARTED, { 
      sessionId, 
      agentId: toAgentId,
      handoverFrom: fromAgentId,
      reason 
    });
  }
}
