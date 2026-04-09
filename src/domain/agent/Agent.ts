/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic and types. No I/O or external dependencies.
 */

export type AgentId = string;

export interface AgentDefinition {
  id: AgentId;
  title?: string;
  description?: string;
  systemPrompt?: string;
  userPrompt?: string;
  model?: string;
  provider?: string;
  tools?: string[];
  maxTurns?: number;
  temperature?: number;
  maxTokens?: number;
  customRules?: string;
}

/**
 * Runtime agent representation.
 */
export class Agent {
  constructor(public readonly def: AgentDefinition) {}

  get id(): AgentId {
    return this.def.id;
  }

  get title(): string {
    return this.def.title || this.def.id;
  }

  get systemPrompt(): string {
    return this.def.systemPrompt || '';
  }

  get model(): string | undefined {
    return this.def.model;
  }

  get tools(): string[] {
    return this.def.tools || [];
  }
}
