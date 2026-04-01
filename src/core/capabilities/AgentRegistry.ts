/**
 * [LAYER: CORE]
 * Principle: Orchestration — manages agent definitions and metadata.
 */

import { Agent, type AgentId, type AgentDefinition } from '../../domain/agent/Agent';

export class AgentRegistry {
  private agents: Map<AgentId, Agent> = new Map();

  register(def: AgentDefinition) {
    const agent = new Agent(def);
    this.agents.set(agent.id, agent);
  }

  getAgent(id: AgentId): Agent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  get defaultAgentId(): AgentId {
    return 'agent-dietcode';
  }
}
