/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Adapters and integrations — orchestrates multi-source prompt loading and merging.
 */

import { PromptIndex, PromptSource, PromptSource as PromptSourceEnum } from '../domain/prompts/PromptIndex';
import { PromptDefinition, PromptCollection, PromptCategory, MaintenanceTier } from '../domain/prompts/PromptCategory';
import { PromptAudit, ConflictResolutionStrategy } from '../domain/prompts/PromptAudit';
import type { EventBus, SystemEvent } from '../domain/Event';
import type { KnowledgeItem } from '../domain/memory/Knowledge';
import { EventType } from '../domain/Event';
import type { ValidationService } from '../domain/system/ValidationProvider';
import type { Filesystem } from '../domain/system/Filesystem';
import type { MemoryService } from '../core/memory/MemoryService';
import { PromptLoader } from './PromptLoader';

export class PromptRegistryAdapter {
  private currentIndex: PromptIndex;
  private activeContext: Record<string, any> = {};
  private conflictLogger: ConflictLogger;

  constructor(
    private filesystem: Filesystem,
    private eventBus: EventBus,
    private validationService: ValidationService,
    private memoryService: MemoryService,
    private promptLoader: PromptLoader,
    private listSources: ListPromptsSourcesFunction,
    private loadSource: LoadPromptSourceFunction
  ) {
    this.currentIndex = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      rootSources: [],
      collections: [],
      auditTrail: []
    };
    this.conflictLogger = new ConflictLogger(this.eventBus);
  }

  /**
   * Multi-source acquisition protocol.
   * Integrates prompts in strict priority order:
   * 1. Local Project Overrides (.dietcode/prompts/)
   * 2. User Repository Overrides (~/.claude-code-prompts/)
   * 3. Embedded Standard Collection (DietCode repo)
   */
  async acquireAll(context: SystemContext): Promise<PromptIndex> {
    const sources = await this.discoverSources();
    
    // Mark each source with priority
    const storedSources = sources.map((source, index) => ({
      origin: source.origin,
      path: source.path,
      priority: index + 1, // Lower number = higher priority
      loadedAt: new Date().toISOString()
    }));

    // Merge all sources
    const merged = await this.mergeIndexedSets(storedSources);
    this.currentIndex.rootSources = storedSources;
    this.currentIndex.collections = merged.collections;
    this.currentIndex.lastUpdated = new Date().toISOString();

    // Emit event indicating successful load
    this.eventBus.publish(EventType.PROMPT_REGISTERED, {
      promptCount: merged.collections.reduce((sum, c) => sum + c.promptDefinitions.length, 0)
    }, { sessionId: context.sessionId });

    return this.currentIndex;
  }

  private async discoverSources(): Promise<Array<{ origin: PromptSourceEnum; path: string }>> {
    const sources: Array<{ origin: PromptSourceEnum; path: string }> = [];

    // Order matters: Project > User > Embedded
    const paths = [
      { origin: PromptSourceEnum.LOCAL_OVERRIDE, path: process.cwd() },
      { origin: PromptSourceEnum.USER_DEFINED, path: process.env.HOME || '/Users/bozoegg' },
      { origin: PromptSourceEnum.REPOSITORY_BASE, path: process.cwd() }
    ];

    for (const { origin, path: basePath } of paths) {
      const promptPath = path.join(basePath, '.claude-code-prompts');
      
      try {
        const stats = await this.filesystem.stat(promptPath);
        if (stats.isDirectory) {
          sources.push({ origin, path: promptPath });
        }
      } catch {
        // Path doesn't exist, skip
      }
    }

    return sources;
  }

  /**
   * Merges multiple sources into a unified prompt index using Conflict Resolver rules.
   */
  private async mergeIndexedSets(sources: Array<{ origin: PromptSourceEnum; path: string }>): Promise<PromptIndex> {
    const mergedCollections = new Map<string, PromptCollection>();
    const auditTrail: PromptAudit[] = [];

    for (const source of sources) {
      // Load collection from source
      const loadStep: PromptAudit['loadChain'][0] = {
        stepNumber: 1,
        sourcePath: source.path,
        action: 'MERGE',
        timestamp: new Date().toISOString()
      };

      try {
        // Discover prompts in this source
        const promptPaths = await this.listPromptsFromSource(source.path);

        for (const promptPath of promptPaths) {
          const prompt = await this.loadSource(promptPath);
          
          // Initialize load chain for this prompt
          const promptAudit: PromptAudit = {
            promptId: prompt.id,
            source: source.origin,
            loadChain: [loadStep, {
              stepNumber: 2,
              sourcePath: promptPath,
              action: 'NEW_PROMPT',
              timestamp: new Date().toISOString()
            }],
            conflictHistory: [],
            integrityHash: this.calculateIntegrityHash(prompt),
            compliance: this.validateCompliance(prompt)
          };

          const existing = mergedCollections.get(prompt.id);

          if (!existing) {
            // Brand new prompt
            const newCollection = this.createCollectionWithPrompt(source.path, prompt);
            mergedCollections.set(prompt.id, newCollection);
            auditTrail.push(promptAudit);
          } else {
            // Conflict detected — apply resolution strategy
            const resolution = await this.resolvePromptConflict(
              existing,
              prompt,
              source.priority
            );

            if (resolution.action === ConflictResolutionStrategy.OVERRIDE) {
              // Replace existing with incoming
              const overrideCollection = this.createCollectionWithPrompt(source.path, prompt);
              mergedCollections.set(prompt.id, overrideCollection);
              
              promptAudit.loadChain.push({
                stepNumber: 3,
                sourcePath: promptPath,
                action: 'OVERRIDE',
                timestamp: new Date().toISOString()
              });
            } else {
              // Annotate existing with conflicting source metadata
              const annotated = this.annotatePrompt(existing, prompt, resolution);
              mergedCollections.set(prompt.id, annotated);
              
              // Track as conflict (but don't change the prompt)
              promptAudit.conflictHistory.push({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                type: 'PRIORITY_VIOLATION',
                resolution: resolution.action,
                affectedPrompts: [prompt.id],
                metadata: { incomingSource: source.origin, existingPriority: existing.metadata.priority }
              });
            }

            auditTrail.push(promptAudit);
          }
        }
      } catch (error) {
        console.error(`Failed to load prompts from ${source.path}:`, error);
        this.eventBus.publish(EventType.PROMPT_LOAD_ERROR, {
          path: source.path,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      rootSources: sources,
      collections: Array.from(mergedCollections.values()),
      auditTrail
    };
  }

  private resolvePromptConflict(
    existing: PromptCollection,
    incoming: PromptCollection,
    incomingPriority: number
  ): RoundResolutionResponse {
    const strategy = ClashResolver.resolveStrategy(
      existing,
      incoming,
      incomingPriority
    );

    return {
      action: strategy,
      reason: this.getResolutionReason(strategy, incomingPriority)
    };
  }

  private createCollectionWithPrompt(sourcePath: string, prompt: PromptDefinition): PromptCollection {
    return {
      id: crypto.randomUUID(),
      category: prompt.category,
      name: prompt.name,
      version: '1.0.0',
      publisher: 'claude-code-prompts',
      licensing: 'Apache-2.0',
      subcollections: [sourcePath],
      promptDefinitions: [prompt]
    };
  }

  private annotatePrompt(
    existing: PromptCollection,
    incoming: PromptDefinition,
    resolution: RoundResolutionResponse
  ): PromptCollection {
    return {
      ...existing,
      promptDefinitions: existing.promptDefinitions.map(p => 
        p.id === incoming.id ? { ...p, metadata: { 
          ...p.metadata, 
          conflicts: p.metadata.conflicts || {},
          lastConflictResolution: resolution.action
        }} : p
      )
    };
  }

  private calculateIntegrityHash(prompt: PromptDefinition): string {
    // Simple hash based on content length + last modified time
    return `${prompt.content.length}-${new Date(prompt.metadata?.source || '').getTime()}`;
  }

  private validateCompliance(prompt: PromptDefinition): PromptAudit['compliance'] {
    const violations: string[] = [];
    let valid = true;

    if (prompt.content.length > 100000) {
      violations.push('Prompt exceeds 100KB size limit');
      valid = false;
    }

    if (prompt.category === PromptCategory.SYSTEM_CORE && prompt.metadata.dangerLevel) {
      violations.push('System core prompt cannot have dangerLevel metadata');
      valid = false;
    }

    return {
      valid,
      violations,
      category: prompt.category,
      hasInteractiveElements: prompt.content.includes('<button') || prompt.content.includes('<input'),
      exceedsSizeLimit: prompt.content.length > 100000
    };
  }

  private getResolutionReason(action: ConflictResolutionStrategy, priority: number): string {
    switch (action) {
      case ConflictResolutionStrategy.OVERRIDE:
        return `Higher priority source (priority ${priority})`;
      case ConflictResolutionStrategy.KEEP_EXISTING:
        return `Existing prompt maintained (priority ${priority})`;
      case ConflictResolutionStrategy.PRUNE:
        return 'Duplicate removed';
      default:
        return 'Default resolution';
    }
  }

  /**
   * Retrieves memory requirements for a specific prompt using PromptMemoryMapper.
   */
  async getMemoryRequirement(promptId: string): Promise<MemoryRequirement | null> {
    const prompt = this.findPromptById(promptId);
    if (!prompt) return null;

    switch (prompt.dietcodeFeature) {
      case 'MEMORY_CHECKPOINT':
        return {
          action: 'FETCH_CONSOLIDATED',
          targetScope: 'codebase',
          maxEntries: prompt.recommendedMemoryDepth || 20,
          priority: 'critical'
        };
      case 'CONTEXT_PROTOCOL':
        return {
          action: 'FETCH_RECENT',
          targetScope: 'project',
          maxEntries: 10,
          priority: 'medium'
        };
      default:
        return null;
    }
  }

  /**
   * Retrieves verification requirements for a specific prompt.
   */
  async getVerificationRequirement(promptId: string): Promise<VerificationRequirement | null> {
    const prompt = this.findPromptById(promptId);
    if (!prompt || !prompt.dangerLevel) return null;

    return {
      action: prompt.dangerLevel === 'critical' ? 'RUN_SECURITY_CHECK' : 'RUN_HEALTH_CHECK',
      checkType: this.determinePermissionTier(prompt.dangerLevel),
      requiresSnapshot: prompt.dangerLevel !== 'low',
      verificationService: 'ValidationService',
      escalationStage: 'before_tool'
    };
  }

  private determinePermissionTier(dangerLevel: string): 'permission_tier_1' | 'permission_tier_2' | 'permission_tier_3' | 'permission_tier_4' {
    switch (dangerLevel) {
      case 'critical': return 'permission_tier_4';
      case 'high': return 'permission_tier_3';
      case 'medium': return 'permission_tier_2';
      default: return 'permission_tier_1';
    }
  }

  /**
   * Finds a specific prompt definition by ID.
   */
  findPromptById(promptId: string): PromptDefinition | undefined {
    for (const collection of this.currentIndex.collections) {
      const prompt = collection.promptDefinitions.find(p => p.id === promptId);
      if (prompt) return prompt;
    }
    return undefined;
  }

  /**
   * Returns a list of all prompts in a specific category.
   */
  findPromptsByCategory(category: PromptCategory): PromptDefinition[] {
    const results: PromptDefinition[] = [];
    for (const collection of this.currentIndex.collections) {
      results.push(...collection.promptDefinitions.filter(p => p.category === category));
    }
    return results;
  }
}

// Helper types and functions

interface SystemContext {
  sessionId: string;
  projectPath: string;
  userContext: Record<string, any>;
}

interface MemoryRequirement {
  action: 'FETCH_CONSOLIDATED' | 'FETCH_RECENT' | 'FETCH_SPECIALIZED' | 'NONE';
  targetScope: 'global' | 'project' | 'tool-specific' | 'codebase';
  maxEntries?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface VerificationRequirement {
  action: 'RUN_SECURITY_CHECK' | 'RUN_HEALTH_CHECK' | 'RUN_HERITAGE_CHECK' | 'NONE';
  checkType: 'permission_tier_1' | 'permission_tier_2' | 'permission_tier_3' | 'permission_tier_4';
  requiresSnapshot?: boolean;
  verificationService: string;
  escalationStage: 'before_tool' | 'after_tool' | 'on_failure';
}

interface RoundResolutionResponse {
  action: ConflictResolutionStrategy;
  reason: string;
}

type ListPromptsSourcesFunction = (path: string) => Promise<readonly string[]>;
type LoadPromptSourceFunction = (path: string) => Promise<PromptDefinition>;

/**
 * Simple Pilc resolver for conflict logic.
 */
class ClashResolver {
  static resolveStrategy(
    existing: PromptCollection,
    incoming: PromptCollection,
    incomingPriority: number
  ): ConflictResolutionStrategy {
    // Rule: User overrides repository
    if (
      incoming.priority === 1 && 
      existing.priority !== 1
    ) {
      return ConflictResolutionStrategy.OVERRIDE;
    }

    // Rule: Priority cascading
    if (incomingPriority > existing.priority) {
      return ConflictResolutionStrategy.OVERRIDE;
    }

    // Rule: If equal priorities, use modification time
    if (incomingPriority === existing.priority) {
      const incomingDate = new Date(incoming.metadata?.timestamp || 0);
      const existingDate = new Date(existing.metadata?.timestamp || 0);
      
      if (!incomingDate.getTime() || !existingDate.getTime()) {
        return ConflictResolutionStrategy.KEEP_EXISTING;
      }
      
      return incomingDate > existingDate 
        ? ConflictResolutionStrategy.OVERRIDE 
        : ConflictResolutionStrategy.KEEP_EXISTING;
    }

    // Default: Keep existing
    return ConflictResolutionStrategy.KEEP_EXISTING;
  }
}

/**
 * Logs conflict resolution events for observability.
 */
class ConflictLogger {
  constructor(private eventBus: EventBus) {}

  log(conflict: ConflictResolution): void {
    this.eventBus.publish(EventType.PROMPT_CONFLICT_RESOLVED, {
      conflictType: conflict.type,
      resolution: conflict.resolution,
      affectedPrompt: conflict.affectedPrompts[0]
    });
  }
}