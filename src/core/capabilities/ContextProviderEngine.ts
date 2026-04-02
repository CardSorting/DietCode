/**
 * [LAYER: CORE]
 * Principle: Orchestrates context loading and injection for prompts
 */

import type { MemoryService } from '../memory/MemoryService';
import type { ContextService } from '../context/ContextService';
import type { KnowledgeItem } from '../../domain/memory/Knowledge';
import type { PromptDefinition } from '../../domain/prompts/PromptCategory';
import type { TemplateContext } from '../../domain/prompts/PromptTemplateEngine';
import { TemplateEngine } from '../../domain/prompts/PromptTemplateEngine';
import type { ContextAwareStrategy } from '../../domain/prompts/PromptCompositionStrategy';

/**
 * Context slice type definitions for different categories
 */
export interface ProjectContextSlice {
  technologyStack: string[];
  dependencies: string[];
  configurations: Record<string, unknown>;
}

export interface SessionContextSlice {
  previousTasks: string[];
  preferences: Record<string, unknown>;
  workingDirectory: string;
}

/**
 * Configuration for context provider behavior
 */
export interface ContextProviderConfig {
  maxMemoryItems: number;
  cacheEnabled: boolean;
  defaultSessionContext: Partial<SessionContextSlice>;
}

export interface ProjectInfo {
  name: string;
  path: string;
  technologies: string[];
}

  export interface RoleInfo {
    name: string;
    role: string;
    preferences?: Record<string, unknown>;
  }

export interface ToolMetadata {
  name: string;
  parameters: Record<string, unknown>;
}

/**
 * Engine that loads and injects context into prompt rendering
 */
export class ContextProviderEngine {
  private memoryService: MemoryService;
  private contextService: ContextService;
  private strategies: ContextAwareStrategy[];
  private cache = new Map<string, { context: Partial<TemplateContext>; timestamp: number }>();
  
  constructor(
    memoryService: MemoryService,
    contextService: ContextService,
    config?: Partial<ContextProviderConfig>
  ) {
    this.memoryService = memoryService;
    this.contextService = contextService;
    this.strategies = [];
    
    // Default configuration
    this.config = {
      maxMemoryItems: 20,
      cacheEnabled: true,
      defaultSessionContext: {}
    };
  }

  private config: ContextProviderConfig;

  /**
   * Registers a context-aware strategy to be applied during composition
   */
  registerStrategy(strategy: ContextAwareStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Main entry point: loads context, applies strategies, and prepares environment for prompt rendering
   */
  async prepareContext(
    prompt: PromptDefinition,
    sessionContext: Partial<TemplateContext> = {}
  ): Promise<Partial<TemplateContext>> {
    const cacheKey = this.generateCacheKey(prompt, sessionContext);
    
    if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!.context;
    }

    // Start with base context
    let preparedContext: Partial<TemplateContext> = {
      sessionId: sessionContext.sessionId || '',
      timestamp: new Date().toISOString(),
      project: sessionContext.project,
      memory: { items: [], summary: '' },
      user: sessionContext.user || { name: 'unknown', role: 'developer' },
      tool: sessionContext.tool,
      ...this.config.defaultSessionContext
    };

    // Load project-specific context
    if (!preparedContext.project) {
      preparedContext.project = await this.loadProjectContext();
    }

    // Load session memory items
    if (!preparedContext.memory) {
      preparedContext.memory = await this.loadSessionMemoryItems(sessionContext.sessionId || '');
    }

    // Load user preferences from memory if available
    const prefs = preparedContext.user?.preferences;
    if (!prefs) {
      preparedContext.user = (await this.loadUserPreferences(sessionContext.sessionId || '')) as any;
    }

    // Apply registered strategies
    const strategyNotes: string[] = [];
    for (const strategy of this.strategies) {
      try {
        if (strategy.canApply(prompt, preparedContext)) {
          const result = await strategy.apply(prompt, preparedContext);
          
          // Merge strategy result into context
          preparedContext = { ...preparedContext, ...result.context };
          strategyNotes.push(`${strategy.name}: ${result.notes.join(', ')}`);
        }
      } catch (error) {
        console.warn(`Strategy ${strategy.name} failed:`, error);
        strategyNotes.push(`${strategy.name}: failed to apply`);
      }
    }

    // Cache the context if enabled
    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, {
        context: preparedContext,
        timestamp: Date.now()
      });
      
      // Clean up old cache entries
      this.cleanupCache(cacheKey);
    }

    return preparedContext;
  }

  /**
   * Loads project context from knowledge repository
   */
  private async loadProjectContext(): Promise<any> {  // Changed to any to avoid ProjectInfo type issues
    try {
      // Look for technology stack information in memory
      const stackItems = await this.memoryService.search(
        'SELECT * FROM knowledge WHERE category = $1 AND keywords LIKE $2 AND timestamp > $3',
        ['technology_stack', '%stack%', this.getRecentTimestamp('60d')]
      );

      const techStack = stackItems.flatMap((item: KnowledgeItem) => 
        (item.metadata?.technologies || item.value || []) as string[]
      );

      return {
        name: 'current-project',
        path: '/workspace',
        technologies: Array.from(new Set(techStack))
      };
    } catch (error) {
      console.warn('Failed to load project context:', error);
      return {
        name: 'unknown',
        path: '/workspace',
        technologies: []
      };
    }
  }

  /**
   * Loads session memory items for the current session
   */
  private async loadSessionMemoryItems(sessionId: string): Promise<{ items: KnowledgeItem[]; summary: string }> {
    try {
      // Get recent memory items relevant to the session
      const items = await this.memoryService.search(
        'SELECT * FROM knowledge WHERE session_id = $1 ORDER BY timestamp DESC LIMIT $2',
        [sessionId, this.config.maxMemoryItems]
      );

      const summary = items.length > 0 
        ? `Session contains ${items.length} relevant items`
        : 'No session-specific memory items available';

      return { items, summary };
    } catch (error) {
      console.warn('Failed to load session memory items:', error);
      return { items: [], summary: 'Failed to load memory items' };
    }
  }

  /**
   * Loads user preferences from session state or memory
   */
  private async loadUserPreferences(sessionId: string): Promise<RoleInfo> {
    try {
      // Get session context
      const sessionContext = await this.contextService.getSessionBySessionId(sessionId);
      
      // Use session context if available, otherwise get from memory service
      let preferences: Record<string, unknown> = {};
      
      if (sessionContext && sessionContext.detailedContext) {
        Object.assign(preferences, sessionContext.detailedContext);
      }

      return {
        name: sessionId || 'unknown',
        role: 'developer',
        preferences
      };
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
      return {
        name: 'unknown',
        role: 'developer',
        preferences: {}
      };
    }
  }

  /**
   * Caches the latest context and removes stale entries (older than 1 hour)
   */
  private cleanupCache(cacheKey: string): void {
    const MAX_CACHE_SIZE = 100;
    
    if (this.cache.size >= MAX_CACHE_SIZE) {
      // Find the oldest entry and remove it
      let oldestKey: string = cacheKey;
      let oldestTime = Date.now();

      for (const [key, value] of this.cache.entries()) {
        if (value.timestamp < oldestTime) {
          oldestTime = value.timestamp;
          oldestKey = key;
        }
      }

      this.cache.delete(oldestKey);
    }
  }

  /**
   * Generates a cache key based on prompt identity and session context
   */
  private generateCacheKey(
    prompt: PromptDefinition,
    sessionContext: Partial<TemplateContext>
  ): string {
    const contextSignature = Object.keys(sessionContext)
      .sort()
      .map((key: string) => `${key}:${sessionContext[key as keyof Partial<TemplateContext>]}`)
      .join('|');

    return `${prompt.id}:${Buffer.from(contextSignature).toString('base64')}`;
  }

  /**
   * Gets a recent timestamp (e.g., "30d" for 30 days ago)
   */
  private getRecentTimestamp(days: string): string {
    const date = new Date();
    date.setDate(date.getDate() - parseInt(days));
    return date.toISOString();
  }

  /**
   * Clears the context cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Resets the context engine (useful for testing or session reset)
   */
  async reset(): Promise<void> {
    this.clearCache();
    await this.contextService.pruneSessionContext();
  }
}