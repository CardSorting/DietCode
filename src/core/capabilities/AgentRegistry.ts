/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: Orchestration — manages agent definitions and metadata.
 */

import { Agent, type AgentDefinition, type AgentId } from '../../domain/agent/Agent';

export class AgentRegistry {
  private agents: Map<AgentId, Agent> = new Map();

  constructor() {
    this.register({
      id: 'agent-dietcode',
      title: 'DietCode Primary',
      systemPrompt: 'You are DietCode, a minimalist but powerful software engineering AI.',
      maxTokens: 4096,
    });
    this.register({
      id: 'agent-distiller',
      title: 'Memory Distiller',
      systemPrompt: 'You are a knowledge distillation engine.',
      maxTokens: 1024,
    });
    this.register({
      id: 'agent-architect',
      title: 'Swarm Architect',
      systemPrompt: 'You are the Swarm Architect.',
      maxTokens: 4096,
    });
  }

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
