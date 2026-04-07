/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Adapters and integrations — orchestrates multi-source prompt loading and merging.
 */

import * as path from 'node:path';
import { ContextProviderEngine } from '../core/capabilities/ContextProviderEngine';
import { RiskAwareCompositionStrategy } from '../core/capabilities/RiskAwareCompositionStrategy';
import type { ContextService } from '../core/context/ContextService';
import type { MemoryService } from '../core/memory/MemoryService';
import type { EventBus } from '../core/orchestration/EventBus';
import type { SystemEvent } from '../domain/Event';
import { EventType } from '../domain/Event';
import type { LogService } from '../domain/logging/LogService';
import type { KnowledgeItem } from '../domain/memory/Knowledge';
import type { ConflictResolution, PromptAudit } from '../domain/prompts/PromptAudit';
import { ConflictResolutionStrategy, ConflictType } from '../domain/prompts/PromptAudit';
import { PromptCategory } from '../domain/prompts/PromptCategory';
import type { PromptCollection, PromptDefinition } from '../domain/prompts/PromptCategory';
import { PromptSource, PromptSource as PromptSourceEnum } from '../domain/prompts/PromptIndex';
import type { PromptIndex, PromptSourceConfig } from '../domain/prompts/PromptIndex';
import { RiskTier } from '../domain/prompts/PromptRiskProfile';
import { TemplateEngine } from '../domain/prompts/PromptTemplateEngine';
import type {
  TemplateContext,
  TemplateRenderOptions,
} from '../domain/prompts/PromptTemplateEngine';
import type { Filesystem } from '../domain/system/Filesystem';
import type { PromptLoader } from './PromptLoader';

export class PromptRegistryAdapter {
  private currentIndex: PromptIndex;
  private activeContext: Record<string, any> = {};
  private conflictLogger: ConflictLogger;
  private contextProvider: ContextProviderEngine;
  private riskStrategy: RiskAwareCompositionStrategy;

  constructor(
    private filesystem: Filesystem,
    private eventBus: EventBus,
    private memoryService: MemoryService,
    private contextService: ContextService,
    private promptLoader: PromptLoader,
    private listSources: ListPromptsSourcesFunction,
    private loadSource: LoadPromptSourceFunction,
    private logService: LogService,
  ) {
    this.currentIndex = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      rootSources: [],
      collections: [],
      auditTrail: [],
    };

    // Initialize context provider engine
    this.contextProvider = new ContextProviderEngine(memoryService, contextService);

    // Initialize risk-aware composition strategy
    this.riskStrategy = new RiskAwareCompositionStrategy();

    // Register risk strategy with context provider (broad type to avoid inference issues)
    (this.contextProvider as any).registerStrategy(this.riskStrategy);

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
    const storedSources: PromptSourceConfig[] = sources.map((source, index) => ({
      origin: source.origin,
      path: source.path,
      priority: index + 1,
      loadedAt: new Date().toISOString(),
    }));

    // Merge all sources
    const merged = await this.mergeIndexedSets(storedSources);
    this.currentIndex.rootSources = storedSources.map((s) => s.origin);
    this.currentIndex.collections = merged.collections;
    this.currentIndex.lastUpdated = new Date().toISOString();

    // Emit event indicating successful load
    this.eventBus.publish(
      EventType.PROMPT_REGISTERED,
      {
        promptCount: merged.collections.reduce((sum, c) => sum + c.promptDefinitions.length, 0),
      },
      { sessionId: context.sessionId },
    );

    return this.currentIndex;
  }

  private async discoverSources(): Promise<Array<{ origin: PromptSourceEnum; path: string }>> {
    const sources: Array<{ origin: PromptSourceEnum; path: string }> = [];

    // Order matters: Project > User > Embedded
    const paths = [
      { origin: PromptSourceEnum.LOCAL_OVERRIDE, path: process.cwd() },
      { origin: PromptSourceEnum.USER_DEFINED, path: process.env.HOME || '/Users/dietcode' },
      { origin: PromptSourceEnum.REPOSITORY_BASE, path: process.cwd() },
    ];

    for (const { origin, path: basePath } of paths) {
      const promptPath = path.join(basePath, '.claude-code-prompts');

      try {
        const stats = this.filesystem.stat(promptPath);
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
  private async mergeIndexedSets(sources: PromptSourceConfig[]): Promise<PromptIndex> {
    const mergedCollections = new Map<string, PromptCollection>();
    const auditTrail: PromptAudit[] = [];

    for (const source of sources) {
      // Load chain for this source
      const loadChain: PromptAudit['loadChain'] = [
        {
          stepNumber: 1,
          sourcePath: source.path,
          action: 'MERGE',
          timestamp: new Date().toISOString(),
        },
      ];

      try {
        // Discover prompts in this source
        const promptPaths = await this.listPromptsFromSource(source.path);

        for (const promptPath of promptPaths) {
          const prompt = await this.loadSource(promptPath);

          // Initialize audit
          const promptAudit: PromptAudit = {
            promptId: prompt.id,
            source: source.origin,
            loadChain: [
              ...loadChain,
              {
                stepNumber: 2,
                sourcePath: promptPath,
                action: 'NEW_PROMPT',
                timestamp: new Date().toISOString(),
              },
            ],
            conflictHistory: [],
            integrityHash: this.calculateIntegrityHash(prompt),
            compliance: this.validateCompliance(prompt),
          };

          const existing = mergedCollections.get(prompt.id);

          if (!existing) {
            // Brand new prompt
            const newCollection = this.createCollectionWithPrompt(source.path, prompt);
            mergedCollections.set(prompt.id, newCollection);
            auditTrail.push(promptAudit);
          } else {
            // Conflict detected — apply resolution strategy
            const resolution = this.resolvePromptConflict(existing, prompt, source.priority);

            if (resolution.action === ConflictResolutionStrategy.OVERRIDE) {
              // Replace existing with incoming
              const overrideCollection = this.createCollectionWithPrompt(source.path, prompt);
              mergedCollections.set(prompt.id, overrideCollection);

              promptAudit.loadChain.push({
                stepNumber: 3,
                sourcePath: promptPath,
                action: 'OVERRIDE',
                timestamp: new Date().toISOString(),
              });
            } else {
              // Annotate existing with conflicting source metadata
              const annotated = this.annotatePrompt(existing, prompt, resolution);
              mergedCollections.set(prompt.id, annotated);

              // Track as conflict (but don't change the prompt)
              promptAudit.conflictHistory.push({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                type: ConflictType.PRIORITY_VIOLATION,
                resolution: resolution.action,
                affectedPrompts: [prompt.id],
                metadata: { incomingSource: source.origin, existingPriority: source.priority },
              });
            }

            auditTrail.push(promptAudit);
          }
        }
      } catch (error) {
        this.logService.error(`Failed to load prompts from ${source.path}:`, error, {
          component: 'PromptRegistryAdapter',
        });
        this.eventBus.publish(EventType.PROMPT_LOAD_ERROR, {
          path: source.path,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      rootSources: sources.map((s) => s.origin),
      collections: Array.from(mergedCollections.values()),
      auditTrail,
    };
  }

  private async listPromptsFromSource(sourcePath: string): Promise<readonly string[]> {
    try {
      return await this.listSources(sourcePath);
    } catch {
      return [];
    }
  }

  private resolvePromptConflict(
    existing: PromptCollection,
    incoming: PromptDefinition,
    incomingPriority: number,
  ): RoundResolutionResponse {
    // Lower priority number = higher priority
    const strategy =
      incomingPriority === 1
        ? ConflictResolutionStrategy.OVERRIDE
        : ConflictResolutionStrategy.KEEP_EXISTING;

    return {
      action: strategy,
      reason: this.getResolutionReason(strategy, incomingPriority),
    };
  }

  private createCollectionWithPrompt(
    sourcePath: string,
    prompt: PromptDefinition,
  ): PromptCollection {
    return {
      id: crypto.randomUUID(),
      category: prompt.category,
      name: prompt.name,
      version: '1.0.0',
      publisher: 'claude-code-prompts',
      licensing: 'Apache-2.0',
      subcollections: [sourcePath],
      promptDefinitions: [prompt],
    };
  }

  private annotatePrompt(
    existing: PromptCollection,
    incoming: PromptDefinition,
    resolution: RoundResolutionResponse,
  ): PromptCollection {
    return {
      ...existing,
      promptDefinitions: existing.promptDefinitions.map((p) =>
        p.id === incoming.id
          ? {
              ...p,
              metadata: {
                ...(p.metadata ?? {}),
                conflicts: p.metadata?.conflicts ?? {},
                lastConflictResolution: resolution.action,
              },
            }
          : p,
      ),
    };
  }

  private calculateIntegrityHash(prompt: PromptDefinition): string {
    // Simple hash based on content length + last modified time
    const source = prompt.metadata?.source ?? '';
    return `${prompt.content.length}-${new Date(source).getTime()}`;
  }

  private validateCompliance(prompt: PromptDefinition): PromptAudit['compliance'] {
    const violations: string[] = [];
    let valid = true;

    if (prompt.content.length > 100000) {
      violations.push('Prompt exceeds 100KB size limit');
      valid = false;
    }

    if (prompt.category === PromptCategory.SYSTEM_CORE && prompt.metadata?.dangerLevel) {
      violations.push('System core prompt cannot have dangerLevel metadata');
      valid = false;
    }

    return {
      valid,
      violations,
      category: prompt.category,
      hasInteractiveElements:
        prompt.content.includes('<button') || prompt.content.includes('<input'),
      exceedsSizeLimit: prompt.content.length > 100000,
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

  private findPromptById(promptId: string): PromptDefinition | null {
    for (const collection of this.currentIndex.collections) {
      const found = collection.promptDefinitions.find((p) => p.id === promptId);
      if (found) return found;
    }
    return null;
  }

  /**
   * Retrieves memory requirements for a specific prompt.
   */
  async getMemoryRequirement(promptId: string): Promise<MemoryRequirement | null> {
    const prompt = this.findPromptById(promptId);
    if (!prompt) return null;

    const feature = prompt.metadata?.dietcodeFeature;
    switch (feature) {
      case 'MEMORY_CHECKPOINT':
        return {
          action: 'FETCH_CONSOLIDATED',
          targetScope: 'codebase',
          maxEntries: prompt.metadata?.recommendedMemoryDepth ?? 20,
          priority: 'critical',
        };
      case 'CONTEXT_PROTOCOL':
        return {
          action: 'FETCH_RECENT',
          targetScope: 'project',
          maxEntries: 10,
          priority: 'medium',
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

    const permissionTier = this.determinePermissionTier(prompt.dangerLevel);

    return {
      action: prompt.dangerLevel === 'high' ? 'RUN_SECURITY_CHECK' : 'RUN_HEALTH_CHECK',
      checkType: permissionTier,
      requiresSnapshot: prompt.dangerLevel !== 'low',
      verificationService: 'ValidationService',
      escalationStage: 'before_tool',
    };
  }

  private determinePermissionTier(
    dangerLevel: string,
  ): 'permission_tier_1' | 'permission_tier_2' | 'permission_tier_3' | 'permission_tier_4' {
    const level = dangerLevel.toLowerCase();

    switch (level) {
      case 'critical':
        return 'permission_tier_4';
      case 'high':
      case 'medium':
        return 'permission_tier_3';
      default:
        return 'permission_tier_1';
    }
  }

  /**
   * Renders a prompt with enhanced risk-aware context and composition.
   */
  async renderPrompt(
    promptId: string,
    sessionContext: Partial<TemplateContext>,
  ): Promise<{ rendered: string; template: PromptDefinition | null; metadata: any }> {
    const prompt = this.findPromptById(promptId);

    if (!prompt) {
      return { rendered: '', template: null, metadata: { error: 'Prompt not found' } };
    }

    const startTime = Date.now();

    // Step 1: Prepare enhanced context using ContextProviderEngine
    const enhancedContext = await this.contextProvider.prepareContext(prompt, sessionContext);

    // Step 2: Apply risk-aware composition strategy if applicable
    const riskNotes: string[] = [];
    if (this.riskStrategy.canApply(prompt, enhancedContext)) {
      const compositionResult = await this.riskStrategy.apply(prompt, enhancedContext);
      riskNotes.push(...compositionResult.notes);
    }

    // Step 2.5: Ensure risk assessment is available (for PromptRegistryAdapter usage)
    if ((this.riskStrategy as any).assessRisk) {
      const promptRisk = (this.riskStrategy as any).assessRisk(prompt, enhancedContext);
      // Use the assessment for other purposes if needed
    }

    // Step 3: Compile and render the final prompt
    const engine = new TemplateEngine();
    const options: TemplateRenderOptions = {
      trace: false,
      strict: true,
      defaultValues: {
        sessionId: enhancedContext.sessionId ?? '',
        timestamp: enhancedContext.timestamp ?? new Date().toISOString(),
      },
    };

    const promptContent = prompt.content;
    const rendered = engine.render(promptContent, enhancedContext as TemplateContext, options);
    const renderTimeMs = Date.now() - startTime;

    return {
      rendered,
      template: prompt,
      metadata: {
        promptId,
        category: prompt.category,
        variableCount: this.countVariables(promptContent),
        templateSizeKb: Math.round(rendered.length / 1024),
        renderTimeMs,
        enabledStrategies: ['context-provider', 'risk-aware-composition'],
        strategyNotes: riskNotes,
        memoryItemsLoaded: enhancedContext.memory?.items.length ?? 0,
      },
    };
  }

  /**
   * Generates a risk profile for a specific prompt execution.
   */
  async assessPromptRisk(promptId: string): Promise<{
    profile: any;
    recommendations: string[];
  }> {
    const prompt = this.findPromptById(promptId);

    if (!prompt) {
      return {
        profile: null,
        recommendations: ['Prompt not found, cannot assess risk'],
      };
    }

    const context = await this.contextProvider.prepareContext(prompt, {});
    const riskProfile = (this.riskStrategy as any).assessRisk(prompt, context);

    const recommendations =
      riskProfile.tier === RiskTier.HIGH
        ? [
            'Request explicit user approval before proceeding',
            'Prepare backup strategy',
            'Run tests in isolation environment',
            'Document rollback procedure',
          ]
        : riskProfile.tier === RiskTier.MEDIUM
          ? [
              'Test thoroughly before merging',
              'Prepare rollback script',
              'Communicate expected impact',
            ]
          : [
              'Standard testing applies',
              'Document any unexpected behavior',
              'Monitor commit history',
            ];

    return {
      profile: riskProfile,
      recommendations,
    };
  }

  /**
   * Returns a list of all prompts in a specific category.
   */
  findPromptsByCategory(category: PromptCategory): PromptDefinition[] {
    const results: PromptDefinition[] = [];
    for (const collection of this.currentIndex.collections) {
      results.push(...collection.promptDefinitions.filter((p) => p.category === category));
    }
    return results;
  }

  private countVariables(template: string): number {
    const matches = template.match(/\{\{[^}]+\}\}/g);
    return matches ? matches.length : 0;
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
 * Logs conflict resolution events for observability.
 */
class ConflictLogger {
  constructor(private eventBus: EventBus) {}

  log(conflict: ConflictResolution): void {
    this.eventBus.publish(EventType.PROMPT_CONFLICT_RESOLVED, {
      conflictType: conflict.type,
      resolution: conflict.resolution,
      affectedPrompt: conflict.affectedPrompts[0],
    });
  }
}
