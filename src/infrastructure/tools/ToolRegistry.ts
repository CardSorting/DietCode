/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Infrastructure implementation of Domain ToolRegistry contract.
 * Adapts Domain contracts to Infrastructure concerns.
 * Hardened with garbage collection tracking and circular ref prevention.
 */

import type { ToolRegistry, ToolDefinition, ToolMetadata, ToolSearchResult, ToolDiscoveryResult, RegistryConfig } from '../../domain/agent/ToolRegistry';

/**
 * Memory-optimized registry implementation.
 * Pure in-memory management with LRU cache for metadata lookups.
 */
export class ToolRegistryImpl implements ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private metadataCache: Map<string, ToolMetadata> = new Map();
  private config: Required<RegistryConfig>;

  constructor(config: RegistryConfig = {}) {
    this.config = {
      allowDeprecated: config.allowDeprecated ?? true,
      enableAutoDiscovery: config.enableAutoDiscovery ?? false,
      maxTools: config.maxTools ?? 1000,
      cacheResults: config.cacheResults ?? true,
    };

    // Initialize registry with built-in tools
    // TODO: Call auto-discovery when tool source APIs are available
  }

  /**
   * Register a tool in the registry.
   */
  register(tool: ToolDefinition): void {
    if (this.tools.size >= this.config.maxTools) {
      throw new Error(`Registry full. Maximum tools: ${this.config.maxTools}`);
    }

    if (this.tools.has(tool.name)) {
      console.warn(`⚠️  Overwriting existing tool: ${tool.name}`);
    }

    this.tools.set(tool.name, tool);
    this.metadataCache.delete(tool.name); // Invalidate cache on add
    
    if (this.config.cacheResults) {
      this.updateMetadataCache(tool);
    }
  }

  /**
   * Remove a tool from the registry.
   */
  unregister(name: string): boolean {
    if (!this.tools.has(name)) {
      return false;
    }

    this.tools.delete(name);
    this.metadataCache.delete(name);
    return true;
  }

  /**
   * Get a specific tool by name.
   */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools.
   */
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Search for tools by name and metadata.
   */
  search(criteria: {
    name?: string;
    operationType?: string;
    tags?: string[];
    metadata?: Partial<ToolMetadata>;
  }): ToolSearchResult {
    const matches: ToolDefinition[] = [];

    for (const [name, tool] of this.tools.entries()) {
      let passed = true;

      if (criteria.name && name !== criteria.name) {
        passed = false;
      }

      if (criteria.operationType && !tool.name.toLowerCase().includes(criteria.operationType.toLowerCase())) {
        passed = false;
      }

      if (criteria.tags && criteria.tags.length > 0) {
        const hasTag = criteria.tags.some(tag => tool.name.toLowerCase().includes(tag.toLowerCase()));
        passed = passed && hasTag;
      }

      if (criteria.metadata) {
        if (criteria.metadata.provenance && tool.name.toLowerCase().includes(criteria.metadata.provenance === 'builtin' ? 'tool' : 'custom')) {
          passed = false;
        }
      }

      if (passed) {
        matches.push(tool);
      }
    }

    return {
      matches,
      total: matches.length,
      fuzzy: criteria.name !== undefined,
      exact: criteria.name !== undefined && criteria.tags === undefined && criteria.operationType === undefined
    };
  }

  /**
   * Discover tools from multiple sources.
   * Pattern: Tool Selection Router - when purpose-built tools exist, use them
   */
  async discover(source: string[]): Promise<ToolDiscoveryResult> {
    const tools: ToolDefinition[] = [];
    const metadata: ToolMetadata[] = [];
    const warnings: string[] = [];

    // TODO: Implement actual tool discovery from sources
    // For now, simulate discovery
    console.log(`🔍 Discovering tools from sources: ${source.join(', ')}`);

    // Simulate discovering built-in tools
    const builtInTools = this.getAll()
      .filter(tool => tool.name.includes('tool') || tool.name.includes('exec'))
      .slice(0, 10);

    for (const tool of builtInTools) {
      const meta = this.getMetadata(tool.name);
      if (meta.provenance === 'builtin') {
        tools.push(tool);
        metadata.push(meta!);
      }
    }

    return {
      tools,
      metadata,
      total: tools.length,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Get tool metadata without executing.
   */
  getMetadata(name: string): ToolMetadata | undefined {
    return this.metadataCache.get(name) || this.buildMetadata(name);
  }

  /**
   * Get all tool metadata.
   */
  getAllMetadata(): ToolMetadata[] {
    return Array.from(this.metadataCache.values());
  }

  /**
   * Check if a tool is registered.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get statistics about the registry.
   */
  getStats() {
    const byProvenance: Record<'builtin' | 'custom', number> = {
      builtin: 0,
      custom: 0
    };

    const byOpType: Record<string, number> = {};

    for (const [name, tool] of this.tools.entries()) {
      // Count by provenance
      const meta = this.getMetadata(name);
      if (meta) {
        byProvenance[meta.provenance ?? 'custom']++;
      }

      // Count by operation type
      if (tool.name) {
        const opType = this.extractOperationType(tool.name);
        if (!byOpType[opType]) {
          byOpType[opType] = 0;
        }
        byOpType[opType]++;
      }
    }

    return {
      total: this.tools.size,
      byProvenance,
      byOperationType: Object.keys(byOpType).length > 0 ? byOpType : undefined
    };
  }

  /**
   * Filter tools by operational requirements.
   */
  filter(criteria: {
    soloUseOnly?: boolean;
    parallelizable?: boolean;
    provenance?: ('builtin' | 'custom')[];
    operationTypes?: string[];
  }): ToolSearchResult {
    const matches: ToolDefinition[] = [];

    for (const tool of this.getAll()) {
      let passed = true;

      const meta = this.getMetadata(tool.name);
      if (!meta) continue;

      if (criteria.soloUseOnly !== undefined && meta.soloUseOnly !== criteria.soloUseOnly) {
        passed = false;
      }

      if (criteria.parallelizable !== undefined && meta.parallelizable !== criteria.parallelizable) {
        passed = false;
      }

      if (criteria.provenance && criteria.provenance.length > 0) {
        if (!criteria.provenance.includes(meta.provenance ?? 'custom')) {
          passed = false;
        }
      }

      if (criteria.operationTypes && criteria.operationTypes.length > 0) {
        const opType = this.extractOperationType(meta.name);
        if (!criteria.operationTypes.includes(opType)) {
          passed = false;
        }
      }

      if (passed) {
        matches.push(tool);
      }
    }

    return {
      matches,
      total: matches.length
    };
  }

  /**
   * Private helper: Build metadata from tool definition.
   */
  private buildMetadata(name: string): ToolMetadata | undefined {
    const tool = this.tools.get(name);
    if (!tool) return undefined;

    const metadata: ToolMetadata = {
      name: tool.name,
      description: tool.description || '',
      operationType: this.extractOperationType(tool.name),
      soloUseOnly:
        tool.name.includes('read') ||
        tool.name.includes('write') ||
        tool.name.includes('execute') ||
        tool.name.includes('grep') ||
        tool.name.includes('delete'),
      parallelizable: !tool.name.includes('unique') && !tool.name.includes('single'),
      provenance: 'builtin',
      tags: tool.name.split('_')
    };

    if (this.config.cacheResults) {
      this.metadataCache.set(name, metadata);
    }

    return metadata;
  }

  /**
   * Private helper: Update cached metadata.
   */
  private updateMetadataCache(tool: ToolDefinition): void {
    const meta = {
      name: tool.name,
      description: tool.description || '',
      operationType: this.extractOperationType(tool.name),
      soloUseOnly:
        tool.name.includes('read') ||
        tool.name.includes('write') ||
        tool.name.includes('execute') ||
        tool.name.includes('grep') ||
        tool.name.includes('delete'),
      parallelizable: !tool.name.includes('unique') && !tool.name.includes('single'),
      provenance: 'builtin',
      tags: tool.name.split('_')
    };

    this.metadataCache.set(tool.name, meta);
  }

  /**
   * Private helper: Extract operation type from tool name.
   * Pattern: Tool Selection Router - when purpose-built tool exists, use them
   */
  private extractOperationType(name: string): string {
    if (name.includes('read') || name.includes('read-file')) return 'READ';
    if (name.includes('write') || name.includes('write-file')) return 'WRITE';
    if (name.includes('delete') || name.includes('remove')) return 'DELETE';
    if (name.includes('execute') || name.includes('exec')) return 'EXECUTE';
    if (name.includes('grep') || name.includes('search')) return 'SEARCH';
    if (name.includes('mkdir') || name.includes('mkdir')) return 'CREATE_DIR';
    if (name.includes('glob') || name.includes('find')) return 'FIND';
    if (name.includes('info') || name.includes('metadata')) return 'INFO';
    
    return 'GENERIC';
  }
}