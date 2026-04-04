/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic and registry contracts.
 * Zero external dependencies or I/O operations.
 */

import type { ToolDefinition } from './ToolDefinition';

/**
 * Discovered tool metadata.
 * Pure domain-level data structure.
 */
export type ToolMetadata = {
  name: string;
  description: string;
  operationType?: string;
  soloUseOnly?: boolean;
  parallelizable?: boolean;
  provenance?: 'builtin' | 'custom';
  tags?: string[];
  dependencies?: string[];
  parameters?: Record<string, unknown>;
};

/**
 * Registry configuration.
 * Pure domain-level data structure.
 */
export type RegistryConfig = {
  allowDeprecated?: boolean;
  enableAutoDiscovery?: boolean;
  maxTools?: number;
  cacheResults?: boolean;
};

/**
 * Tool discovery result.
 * Pure domain-level data structure.
 */
export type ToolDiscoveryResult = {
  tools: ToolDefinition[];
  metadata: ToolMetadata[];
  total: number;
  warnings?: string[];
};

/**
 * Registry search result.
 * Pure domain-level data structure.
 */
export type ToolSearchResult = {
  matches: ToolDefinition[];
  fuzzy?: boolean;
  exact?: boolean;
  total: number;
};

/**
 * Registry contract for tool management and discovery.
 * Pure domain-level operation - no I/O, pure orchestration.
 */
export interface ToolRegistry {
  /**
   * Register a tool in the registry.
   * Pure domain-level operation.
   */
  register(tool: ToolDefinition): void;

  /**
   * Remove a tool from the registry.
   * Pure domain-level operation.
   */
  unregister(name: string): boolean;

  /**
   * Get a specific tool by name.
   * Pure domain-level operation.
   */
  get(name: string): ToolDefinition | undefined;

  /**
   * Get all registered tools.
   * Pure domain-level operation.
   */
  getAll(): ToolDefinition[];

  /**
   * Search for tools by name and metadata.
   * Pure domain-level operation.
   */
  search(criteria: {
    name?: string;
    operationType?: string;
    tags?: string[];
    metadata?: Partial<ToolMetadata>;
  }): ToolSearchResult;

  /**
   * Discover tools from multiple sources.
   * Pattern: Tool Selection Router - when purpose-built tools exist, use them
   */
  discover(source: string[]): Promise<ToolDiscoveryResult>;

  /**
   * Get tool metadata without executing.
   * Pure domain-level operation.
   */
  getMetadata(name: string): ToolMetadata | undefined;

  /**
   * Get all tool metadata.
   * Pure domain-level operation.
   */
  getAllMetadata(): ToolMetadata[];

  /**
   * Check if a tool is registered.
   * Pure domain-level operation.
   */
  has(name: string): boolean;

  /**
   * Get statistics about the registry.
   * Pure domain-level operation.
   */
  getStats(): {
    total: number;
    byProvenance: Record<'builtin' | 'custom', number>;
    byOperationType?: Record<string, number>;
  };

  /**
   * Filter tools by operational requirements.
   * Pattern: "Purpose-built tools give user better visibility, make review easier"
   */
  filter(criteria: {
    soloUseOnly?: boolean;
    parallelizable?: boolean;
    provenance?: ('builtin' | 'custom')[];
    operationTypes?: string[];
  }): ToolSearchResult;
}

/**
 * Registry factory contract.
 */
export interface RegistryFactory {
  create(config?: RegistryConfig): ToolRegistry;
}
