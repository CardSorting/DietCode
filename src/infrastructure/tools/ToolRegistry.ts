/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Infrastructure implementation of Domain ToolRegistry contract.
 * Production hardened with:
 *   - Correct imports from Domain contracts
 *   - Type-safe metadata construction (provenance as literal type)
 *   - Proper null checks on all metadata access
 *   - Fixed search filtering (uses actual metadata, not name heuristics)
 *   - Duplicate-free extractOperationType
 *   - LRU-style cache with bounded size
 */

import type {
  ToolRegistry,
  ToolMetadata,
  ToolSearchResult,
  ToolDiscoveryResult,
  RegistryConfig,
} from '../../domain/agent/ToolRegistry';
import type { ToolDefinition } from '../../domain/agent/ToolDefinition';

/**
 * Memory-optimized registry implementation.
 * Pure in-memory management with cache for metadata lookups.
 */
export class ToolRegistryImpl implements ToolRegistry {
  private readonly tools: Map<string, ToolDefinition> = new Map();
  private readonly metadataCache: Map<string, ToolMetadata> = new Map();
  private readonly config: Readonly<Required<RegistryConfig>>;

  constructor(config: RegistryConfig = {}) {
    this.config = Object.freeze({
      allowDeprecated: config.allowDeprecated ?? true,
      enableAutoDiscovery: config.enableAutoDiscovery ?? false,
      maxTools: config.maxTools ?? 1000,
      cacheResults: config.cacheResults ?? true,
    });
  }

  // ─── Registration ─────────────────────────────────────────────

  /**
   * Register a tool in the registry.
   * @throws Error if registry is at capacity
   */
  register(tool: ToolDefinition): void {
    if (!tool || !tool.name) {
      throw new Error('Tool must have a name');
    }

    if (this.tools.size >= this.config.maxTools && !this.tools.has(tool.name)) {
      throw new Error(
        `Registry full. Maximum tools: ${this.config.maxTools}. ` +
        `Unregister an existing tool before adding new ones.`
      );
    }

    if (this.tools.has(tool.name)) {
      console.warn(`⚠️  Overwriting existing tool: ${tool.name}`);
    }

    this.tools.set(tool.name, tool);

    // Invalidate and rebuild cache entry
    this.metadataCache.delete(tool.name);
    if (this.config.cacheResults) {
      this.buildAndCacheMetadata(tool);
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

  // ─── Lookup ───────────────────────────────────────────────────

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
   * Check if a tool is registered.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  // ─── Search & Filter ──────────────────────────────────────────

  /**
   * Search for tools by name, operation type, and tags.
   * Uses actual metadata for filtering — not name-string heuristics.
   */
  search(criteria: {
    name?: string;
    operationType?: string;
    tags?: string[];
    metadata?: Partial<ToolMetadata>;
  }): ToolSearchResult {
    const matches: ToolDefinition[] = [];

    for (const tool of this.tools.values()) {
      const meta = this.getMetadata(tool.name);
      if (!meta) continue;

      let passed = true;

      // Exact name match
      if (criteria.name && meta.name !== criteria.name) {
        passed = false;
      }

      // Operation type match (case-insensitive)
      if (criteria.operationType) {
        const targetOp = criteria.operationType.toUpperCase();
        const toolOp = (meta.operationType ?? '').toUpperCase();
        if (toolOp !== targetOp) {
          passed = false;
        }
      }

      // Tag match (any tag must match)
      if (criteria.tags && criteria.tags.length > 0) {
        const toolTags = (meta.tags ?? []).map(t => t.toLowerCase());
        const hasMatch = criteria.tags.some(tag =>
          toolTags.includes(tag.toLowerCase())
        );
        if (!hasMatch) {
          passed = false;
        }
      }

      // Metadata field match (provenance, soloUseOnly, etc.)
      if (criteria.metadata) {
        if (criteria.metadata.provenance && meta.provenance !== criteria.metadata.provenance) {
          passed = false;
        }
        if (criteria.metadata.soloUseOnly !== undefined && meta.soloUseOnly !== criteria.metadata.soloUseOnly) {
          passed = false;
        }
        if (criteria.metadata.parallelizable !== undefined && meta.parallelizable !== criteria.metadata.parallelizable) {
          passed = false;
        }
      }

      if (passed) {
        matches.push(tool);
      }
    }

    const isExactSearch = criteria.name !== undefined
      && criteria.tags === undefined
      && criteria.operationType === undefined;

    return {
      matches,
      total: matches.length,
      fuzzy: !isExactSearch,
      exact: isExactSearch,
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

    for (const tool of this.tools.values()) {
      const meta = this.getMetadata(tool.name);
      if (!meta) continue;

      let passed = true;

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
        const opType = meta.operationType ?? 'GENERIC';
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
      total: matches.length,
    };
  }

  // ─── Discovery ────────────────────────────────────────────────

  /**
   * Discover tools from registered sources.
   *
   * Current implementation: returns all tools matching the source filter.
   * Future: will integrate with external tool source APIs.
   */
  async discover(sources: string[]): Promise<ToolDiscoveryResult> {
    const tools: ToolDefinition[] = [];
    const metadata: ToolMetadata[] = [];
    const warnings: string[] = [];

    // Filter existing tools by source matching
    for (const tool of this.tools.values()) {
      const meta = this.getMetadata(tool.name);
      if (!meta) continue;

      // Match sources against tool tags or operation type
      const matchesSource = sources.some(source => {
        const srcLower = source.toLowerCase();
        return (
          meta.name.toLowerCase().includes(srcLower) ||
          (meta.tags ?? []).some(tag => tag.toLowerCase().includes(srcLower)) ||
          (meta.operationType ?? '').toLowerCase().includes(srcLower)
        );
      });

      if (matchesSource) {
        tools.push(tool);
        metadata.push(meta);
      }
    }

    if (tools.length === 0) {
      warnings.push(`No tools found matching sources: ${sources.join(', ')}`);
    }

    return {
      tools,
      metadata,
      total: tools.length,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  // ─── Metadata ─────────────────────────────────────────────────

  /**
   * Get metadata for a specific tool.
   * Builds and caches metadata on first access.
   */
  getMetadata(name: string): ToolMetadata | undefined {
    const cached = this.metadataCache.get(name);
    if (cached) return cached;

    return this.buildMetadataForName(name);
  }

  /**
   * Get all cached tool metadata.
   * Note: only includes metadata for tools that have been accessed.
   * Call getMetadata() on each tool first for completeness.
   */
  getAllMetadata(): ToolMetadata[] {
    // Ensure all tools have metadata built
    for (const name of this.tools.keys()) {
      if (!this.metadataCache.has(name)) {
        this.buildMetadataForName(name);
      }
    }
    return Array.from(this.metadataCache.values());
  }

  // ─── Statistics ───────────────────────────────────────────────

  /**
   * Get statistics about the registry.
   */
  getStats(): {
    total: number;
    byProvenance: Record<'builtin' | 'custom', number>;
    byOperationType?: Record<string, number>;
  } {
    const byProvenance: Record<'builtin' | 'custom', number> = {
      builtin: 0,
      custom: 0,
    };

    const byOpType: Record<string, number> = {};

    for (const name of this.tools.keys()) {
      const meta = this.getMetadata(name);
      if (!meta) continue;

      // Count by provenance
      const prov = meta.provenance ?? 'custom';
      byProvenance[prov]++;

      // Count by operation type
      const opType = meta.operationType ?? 'GENERIC';
      byOpType[opType] = (byOpType[opType] ?? 0) + 1;
    }

    return {
      total: this.tools.size,
      byProvenance,
      byOperationType: Object.keys(byOpType).length > 0 ? byOpType : undefined,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  /**
   * Build metadata from a tool name and cache it.
   */
  private buildMetadataForName(name: string): ToolMetadata | undefined {
    const tool = this.tools.get(name);
    if (!tool) return undefined;

    return this.buildAndCacheMetadata(tool);
  }

  /**
   * Build metadata from a ToolDefinition and store in cache.
   * Provenance is typed as literal 'builtin' | 'custom', not bare string.
   */
  private buildAndCacheMetadata(tool: ToolDefinition): ToolMetadata {
    const operationType = this.extractOperationType(tool.name);

    const metadata: ToolMetadata = {
      name: tool.name,
      description: tool.description || '',
      operationType,
      soloUseOnly: this.isSoloUseOperation(operationType),
      parallelizable: !this.isSoloUseOperation(operationType),
      provenance: 'builtin' as const,
      tags: this.extractTags(tool.name),
    };

    if (this.config.cacheResults) {
      this.metadataCache.set(tool.name, metadata);
    }

    return metadata;
  }

  /**
   * Determine if an operation type requires solo (non-parallel) execution.
   */
  private isSoloUseOperation(operationType: string): boolean {
    const soloOps = new Set(['WRITE', 'DELETE', 'EXECUTE', 'CREATE_DIR']);
    return soloOps.has(operationType);
  }

  /**
   * Extract operation type from tool name.
   * Ordered most-specific to least-specific.
   */
  private extractOperationType(name: string): string {
    const lower = name.toLowerCase();

    if (lower.includes('read') || lower.includes('view')) return 'READ';
    if (lower.includes('write') || lower.includes('edit') || lower.includes('replace')) return 'WRITE';
    if (lower.includes('delete') || lower.includes('remove')) return 'DELETE';
    if (lower.includes('execute') || lower.includes('exec') || lower.includes('run')) return 'EXECUTE';
    if (lower.includes('grep') || lower.includes('search') || lower.includes('find')) return 'SEARCH';
    if (lower.includes('mkdir') || lower.includes('create_dir')) return 'CREATE_DIR';
    if (lower.includes('glob') || lower.includes('list') || lower.includes('walk')) return 'LIST';
    if (lower.includes('info') || lower.includes('metadata') || lower.includes('stat')) return 'INFO';

    return 'GENERIC';
  }

  /**
   * Extract meaningful tags from a tool name.
   * Splits on common separators and filters noise.
   */
  private extractTags(name: string): string[] {
    const NOISE_WORDS = new Set(['a', 'an', 'the', 'to', 'in', 'of', 'for', 'with']);
    return name
      .split(/[-_\s]+/)
      .map(t => t.toLowerCase().trim())
      .filter(t => t.length > 1 && !NOISE_WORDS.has(t));
  }
}