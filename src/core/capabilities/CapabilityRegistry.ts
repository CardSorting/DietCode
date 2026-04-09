/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: Orchestrates domain capabilities and their metadata
 */

export interface CapabilityMetadata {
  version?: string;
  author?: string;
  description?: string;
  minimumVersion?: string;
}

export interface CapabilityRegistration {
  name: string;
  available: boolean;
  path?: string;
  metadata?: CapabilityMetadata;
}

export class CapabilityRegistry {
  private capabilities: Map<string, CapabilityRegistration> = new Map();

  register(capability: CapabilityRegistration): void {
    this.capabilities.set(capability.name, capability);

    const subPaths = capability.path?.toLowerCase().split('/') || [];
    for (const subPath of subPaths) {
      if (subPath && !this.capabilities.has(subPath)) {
        this.capabilities.set(subPath, {
          name: subPath,
          available: capability.available,
        });
      }
    }
  }

  get(name: string): CapabilityRegistration | undefined {
    return this.capabilities.get(name);
  }

  getAll(): CapabilityRegistration[] {
    return Array.from(this.capabilities.values());
  }

  has(name: string): boolean {
    return this.capabilities.has(name);
  }
}

export const defaultCapabilityRegistry = new CapabilityRegistry();
