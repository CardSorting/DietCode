/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: Central registry for managing Domain contract implementations.
 * Decouples service lookup from business logic.
 */

import type { LLMProvider } from '../../domain/LLMProvider';
import type { Filesystem } from '../../domain/system/Filesystem';
import type { TerminalInterface } from '../../domain/system/TerminalInterface';

export class Registry {
  private static instance: Registry;
  private services: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): Registry {
    if (!Registry.instance) {
      Registry.instance = new Registry();
    }
    return Registry.instance;
  }

  register<T>(key: string, implementation: T): void {
    this.services.set(key, implementation);
  }

  get<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service '${key}' not found in registry.`);
    }
    return service;
  }
}

export const SERVICES = {
  LLM: 'LLMProvider',
  UI: 'TerminalInterface',
  FS: 'Filesystem',
  DATABASE: 'Core',
  REPOSITORY: 'SessionRepository',
  DECISIONS_REPOSITORY: 'DecisionRepository',
  QUEUE: 'SqliteQueue',
  AGENT_REGISTRY: 'AgentRegistry',
};
