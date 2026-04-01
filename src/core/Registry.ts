/**
 * [LAYER: CORE]
 * Principle: Central registry for managing Domain contract implementations.
 * Decouples service lookup from business logic.
 */

import { LLMProvider } from '../domain/LLMProvider';
import { TerminalInterface } from '../domain/TerminalInterface';
import { Filesystem } from '../domain/Filesystem';

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
};
