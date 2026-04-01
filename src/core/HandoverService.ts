/**
 * [LAYER: CORE]
 * Principle: Swarm Coordination — manages transitions between specialized agents.
 * Allows one agent to hand over a session to another.
 */

import { EventBus } from './EventBus';
import { EventType } from '../domain/Event';
import type { AgentRegistry } from './AgentRegistry';
import type { AgentId } from '../domain/Agent';

export class HandoverService {
  private eventBus: EventBus = EventBus.getInstance();

  constructor(private agentRegistry: AgentRegistry) {}

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
    
    // In a real swarm, this would trigger a state migration and a new LLM call 
    // with the target agent's system prompt.
  }
}
