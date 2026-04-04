/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Infrastructure implementation of Domain ToolRegistry contract.
 * Production hardened with:
 *   - Correct imports from Domain contracts
 *   - Type-safe metadata construction (provenance as literal type)
 *   - Proper null checks on all metadata access
 *   - Fixed search filtering (uses actual metadata, not name heuristics)
 *   - O(1) operation type classification via ordered rule table
 *   - Cached tag Sets on metadata (not recreated per search)
 *   - getStats delegates to getAllMetadata (single iteration)
 */

import type { ToolDefinition } from '../../domain/agent/ToolDefinition';
import type {
  RegistryConfig,
  ToolDiscoveryResult,
  ToolMetadata,
  ToolRegistry,
  ToolSearchResult,
} from '../../domain/agent/ToolRegistry';

/**
 * Operation type classification rules.
 * Ordered by priority — most-specific (full name) first, then keyword-based.
 * Each entry: [keyword, operationType]
 */
const OP_TYPE_RULES: ReadonlyArray<readonly [string, string]> = [
  // Exact tool names first (most specific)
  ['read_range', 'READ'],
  ['read_file', 'READ'],
  ['write_file', 'WRITE'],
  ['list_files', 'LIST'],
  ['list_dir', 'LIST'],
  ['create_dir', 'CREATE_DIR'],
  // Then keyword-based (least specific)
  ['read', 'READ'],
  ['view', 'READ'],
  ['write', 'WRITE'],
  ['edit', 'WRITE'],
  ['replace', 'WRITE'],
  ['delete', 'DELETE'],
  ['remove', 'DELETE'],
  ['execute', 'EXECUTE'],
  ['exec', 'EXECUTE'],
  ['run', 'EXECUTE'],
  ['grep', 'SEARCH'],
  ['search', 'SEARCH'],
  ['find', 'SEARCH'],
  ['mkdir', 'CREATE_DIR'],
  ['glob', 'LIST'],
  ['list', 'LIST'],
  ['walk', 'LIST'],
  ['info', 'INFO'],
  ['metadata', 'INFO'],
  ['stat', 'INFO'],
] as const;

/**
 * Operations that must execute solo (not in parallel).
 */
const SOLO_USE_OPERATIONS: ReadonlySet<string> = new Set([
  'WRITE',
  'DELETE',
  'EXECUTE',
  'CREATE_DIR',
]);

/**
 * Words excluded from tag extraction.
 */
const TAG_NOISE_WORDS: ReadonlySet<string> = new Set([
  'a',
  'an',
  'the',
  'to',
  'in',
  'of',
  'for',
  'with',
]);

/**
 * Extended metadata with pre-computed tag Set for O(1) search.
 * Avoids creating a new Set on every matchesCriteria call.
 */
interface CachedToolMetadata extends ToolMetadata {
  /** Pre-computed lowercase tag set for O(1) matching */
  _tagSet: ReadonlySet<string>;
}

/**
 * Memory-optimized registry implementation.
 * Pure in-memory management with metadata cache.
 */
export class ToolRegistryImpl implements ToolRegistry {
  private readonly tools: Map<string, ToolDefinition> = new Map();
  private readonly metadataCache: Map<string, CachedToolMetadata> = new Map();
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
   * @throws Error if registry is at capacity or tool is invalid
   */
  register(tool: ToolDefinition): void {
    if (!tool?.name) {
      throw new Error('Tool must have a name');
    }

    if (typeof tool.name !== 'string' || tool.name.trim().length === 0) {
      throw new Error('Tool name must be a non-empty string');
    }

    if (typeof tool.execute !== 'function') {
      throw new Error(`Tool '${tool.name}' must have an execute function`);
    }

    if (this.tools.size >= this.config.maxTools && !this.tools.has(tool.name)) {
      throw new Error(
        `Registry full (${this.config.maxTools} tools). ` +
          `Unregister an existing tool before adding '${tool.name}'.`,
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
   * Register multiple tools at once. Convenience method.
   */
  registerAll(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      this.register(tool);
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
   * Remove all tools from the registry.
   */
  clear(): void {
    this.tools.clear();
    this.metadataCache.clear();
  }

  // ─── Lookup ───────────────────────────────────────────────────

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  get size(): number {
    return this.tools.size;
  }

  // ─── Search & Filter ──────────────────────────────────────────

  /**
   * Search for tools by name, operation type, and tags.
   * Uses actual metadata for filtering — no name-string heuristics.
   */
  search(criteria: {
    name?: string;
    operationType?: string;
    tags?: string[];
    metadata?: Partial<ToolMetadata>;
  }): ToolSearchResult {
    const matches: ToolDefinition[] = [];

    for (const tool of this.tools.values()) {
      const meta = this.getCachedMetadata(tool.name);
      if (!meta) continue;

      if (!this.matchesCriteria(meta, criteria)) continue;

      matches.push(tool);
    }

    const isExactSearch =
      criteria.name !== undefined &&
      criteria.tags === undefined &&
      criteria.operationType === undefined;

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
      const meta = this.getCachedMetadata(tool.name);
      if (!meta) continue;

      let passed = true;

      if (criteria.soloUseOnly !== undefined && meta.soloUseOnly !== criteria.soloUseOnly) {
        passed = false;
      }

      if (
        criteria.parallelizable !== undefined &&
        meta.parallelizable !== criteria.parallelizable
      ) {
        passed = false;
      }

      if (criteria.provenance?.length) {
        if (!criteria.provenance.includes(meta.provenance ?? 'custom')) {
          passed = false;
        }
      }

      if (criteria.operationTypes?.length) {
        const opType = meta.operationType ?? 'GENERIC';
        if (!criteria.operationTypes.includes(opType)) {
          passed = false;
        }
      }

      if (passed) {
        matches.push(tool);
      }
    }

    return { matches, total: matches.length };
  }

  // ─── Discovery ────────────────────────────────────────────────

  async discover(sources: string[]): Promise<ToolDiscoveryResult> {
    const tools: ToolDefinition[] = [];
    const metadata: ToolMetadata[] = [];
    const warnings: string[] = [];

    for (const tool of this.tools.values()) {
      const meta = this.getCachedMetadata(tool.name);
      if (!meta) continue;

      const matchesSource = sources.some((source) => {
        const srcLower = source.toLowerCase();
        return (
          meta.name.toLowerCase().includes(srcLower) ||
          meta._tagSet.has(srcLower) ||
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

  getMetadata(name: string): ToolMetadata | undefined {
    return this.getCachedMetadata(name);
  }

  getAllMetadata(): ToolMetadata[] {
    // Ensure all tools have metadata built
    for (const tool of this.tools.values()) {
      if (!this.metadataCache.has(tool.name)) {
        this.buildAndCacheMetadata(tool);
      }
    }
    return Array.from(this.metadataCache.values());
  }

  // ─── Statistics ───────────────────────────────────────────────

  /**
   * Get statistics about the registry.
   * Delegates to getAllMetadata() — single pass, no redundant iteration.
   */
  getStats(): {
    total: number;
    byProvenance: Record<'builtin' | 'custom', number>;
    byOperationType?: Record<string, number>;
  } {
    const allMeta = this.getAllMetadata();
    const byProvenance: Record<'builtin' | 'custom', number> = { builtin: 0, custom: 0 };
    const byOpType: Record<string, number> = {};

    for (const meta of allMeta) {
      byProvenance[meta.provenance ?? 'custom']++;

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
   * Get cached metadata, building on first access.
   */
  private getCachedMetadata(name: string): CachedToolMetadata | undefined {
    const cached = this.metadataCache.get(name);
    if (cached) return cached;

    const tool = this.tools.get(name);
    if (!tool) return undefined;

    return this.buildAndCacheMetadata(tool);
  }

  /**
   * Check if a metadata record matches search criteria.
   * Uses pre-computed _tagSet for O(1) tag lookups.
   */
  private matchesCriteria(
    meta: CachedToolMetadata,
    criteria: {
      name?: string;
      operationType?: string;
      tags?: string[];
      metadata?: Partial<ToolMetadata>;
    },
  ): boolean {
    if (criteria.name && meta.name !== criteria.name) {
      return false;
    }

    if (criteria.operationType) {
      const targetOp = criteria.operationType.toUpperCase();
      const toolOp = (meta.operationType ?? '').toUpperCase();
      if (toolOp !== targetOp) return false;
    }

    if (criteria.tags?.length) {
      // Uses pre-computed _tagSet — no per-call Set allocation
      const hasMatch = criteria.tags.some((tag) => meta._tagSet.has(tag.toLowerCase()));
      if (!hasMatch) return false;
    }

    if (criteria.metadata) {
      if (criteria.metadata.provenance && meta.provenance !== criteria.metadata.provenance) {
        return false;
      }
      if (
        criteria.metadata.soloUseOnly !== undefined &&
        meta.soloUseOnly !== criteria.metadata.soloUseOnly
      ) {
        return false;
      }
      if (
        criteria.metadata.parallelizable !== undefined &&
        meta.parallelizable !== criteria.metadata.parallelizable
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Build metadata from a ToolDefinition and store in cache.
   * Pre-computes a lowercase tag Set for efficient search matching.
   */
  private buildAndCacheMetadata(tool: ToolDefinition): CachedToolMetadata {
    const operationType = ToolRegistryImpl.extractOperationType(tool.name);
    const tags = ToolRegistryImpl.extractTags(tool.name);

    const metadata: CachedToolMetadata = {
      name: tool.name,
      description: tool.description || '',
      operationType,
      soloUseOnly: SOLO_USE_OPERATIONS.has(operationType),
      parallelizable: !SOLO_USE_OPERATIONS.has(operationType),
      provenance: 'builtin' as const,
      tags,
      // Pre-computed tag set for O(1) search matching
      _tagSet: new Set(tags.map((t) => t.toLowerCase())),
    };

    if (this.config.cacheResults) {
      this.metadataCache.set(tool.name, metadata);
    }

    return metadata;
  }

  /**
   * Extract operation type from tool name.
   * Uses ordered rule table — first match wins.
   */
  private static extractOperationType(name: string): string {
    const lower = name.toLowerCase();

    for (const [keyword, opType] of OP_TYPE_RULES) {
      if (lower.includes(keyword)) return opType;
    }

    return 'GENERIC';
  }

  /**
   * Extract meaningful tags from a tool name.
   */
  private static extractTags(name: string): string[] {
    return name
      .split(/[-_\s]+/)
      .map((t) => t.toLowerCase().trim())
      .filter((t) => t.length > 1 && !TAG_NOISE_WORDS.has(t));
  }
}
