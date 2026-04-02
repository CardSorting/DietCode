/**
 * [LAYER: CORE]
 * Principle: Capability Awareness — tracks available system tools and environment features.
 * Implementation: Registry of discovered binaries and services.
 */

export interface Capability {
  name: string;
  version?: string;
  available: boolean;
  path?: string;
  metadata?: Record<string, any>;
}

export class CapabilityRegistry {
  private static instance: CapabilityRegistry;
  private capabilities = new Map<string, Capability>();

  private constructor() {}

  static getInstance(): CapabilityRegistry {
    if (!CapabilityRegistry.instance) {
      CapabilityRegistry.instance = new CapabilityRegistry();
    }
    return CapabilityRegistry.instance;
  }

  register(capability: Capability): void {
    this.capabilities.set(capability.name, capability);
    if (capability.available) {
      console.log(`🚀 [CAPABILITY] Registered: ${capability.name}${capability.version ? ` (${capability.version})` : ''}`);
    }
  }

  get(name: string): Capability | undefined {
    return this.capabilities.get(name);
  }

  isAvailable(name: string): boolean {
    return this.capabilities.get(name)?.available ?? false;
  }

  getAll(): Capability[] {
    return Array.from(this.capabilities.values());
  }

  clear(): void {
    this.capabilities.clear();
  }
}

export const defaultCapabilityRegistry = CapabilityRegistry.getInstance();
