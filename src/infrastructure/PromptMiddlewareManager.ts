/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Adapters and integrations — reactive prompt modification middleware.
 */

import type { EventBus } from '../core/orchestration/EventBus';
import type { SystemEvent } from '../domain/Event';
import { EventType } from '../domain/Event';
import type { LogService } from '../domain/logging/LogService';
import type { PromptDefinition } from '../domain/prompts/PromptCategory';

export type PromptModifier = (prompt: string, event: SystemEvent) => string;

export class PromptMiddlewareManager {
  private middlewareMap: Map<EventType, PromptModifier>;

  constructor(
    private eventBus: EventBus,
    private logService: LogService,
  ) {
    this.middlewareMap = new Map();
    this.initializeMiddlewareRegistry();
  }

  /**
   * Registers middleware functions for specific event types.
   * Middleware runs in reverse insertion order (last registered = highest priority).
   */
  registerMiddleware(eventType: EventType, modifier: PromptModifier): void {
    this.middlewareMap.set(eventType, modifier);
  }

  /**
   * Initializes the standard middleware registry with context-aware augmentations.
   */
  private initializeMiddlewareRegistry(): void {
    // 1. Snapshot-Induced Safety Warnings
    this.registerMiddleware(EventType.SNAPSHOT_CREATED, (prompt: string, event: SystemEvent) => {
      const filePath = event.data.filePath || 'unknown';
      const admonition = `
---
## [SUSPENSION ALERT]: Snapshot Created
**Action Disallowed:** File previously edited has been backed up to preview.
**Recommendation:** Smart verification of semantic equivalence before revert.
**Reference:** ${filePath}

Please verify schema integrity before proceeding.
---
        `.trim();

      return `${admonition}\n\n${prompt}`;
    });

    // 2. Memory Learning Pattern Injectors
    this.registerMiddleware(EventType.KNOWLEDGE_GAINED, (prompt: string, event: SystemEvent) => {
      const newItem = event.data.item;
      if (!newItem) return prompt;

      const insight = `
---
## [MEMORY INSIGHT]: Project Continuity Detected
**Capacity:** ${this.extrapolateCapacity(newItem)}
**Confidence:** ${Math.round(newItem.confidence * 100)}%

**Key Learnings:**
- ${this.summarizeLearning(newItem)}

**Recommendation:** Apply to relevant codebase patterns ${this.suggestApplication(newItem.key)}
---
        `.trim();

      return `${insight}\n\n${prompt}`;
    });

    // 3. Tool Success Rate Decay Prevention
    this.registerMiddleware(EventType.TOOL_CALL_FAILURE, (prompt: string, event: SystemEvent) => {
      const toolName = event.data.tool;
      const error = event.data.error || 'Unknown error';

      const correction = `
---
## [RECURSION DETECTED]: Previous Failure
**Tool:** ${toolName}
**Error:** ${error}
**Recall:** Fix broken invocations before recursive reattempt.

**Immediate Fixes:**
1. Verify command syntax against tool definitions
2. Check file permissions and path existence
3. Validate parameter types and constraints
4. Attempt dry-run mode if available

Refocus on stable subsystems before proceeding.
---
        `.trim();

      return `${correction}\n\n${prompt}`;
    });

    // 4. Context Relevance Detection
    this.registerMiddleware(EventType.CONTEXT_LOADED, (prompt: string, event: SystemEvent) => {
      const contextScope = event.data.scope || 'unknown';
      const discoveryType = event.data.discoveryType || 'unknown';

      const guidance = `
---
## [PROJECT CONTEXT]: Environment State
**Scope:** ${contextScope}
**Discovery Strategy:** ${discoveryType}

**Context Flags:**
${this.renderContextFlags(event.data, discoveryType)}

**Agent Guidance:** Align response strategy with discovered context patterns.
---
        `.trim();

      return `${guidance}\n\n${prompt}`;
    });

    // 5. Implementation Lifecycle Events
    this.registerMiddleware(
      EventType.IMPLEMENTATION_STARTED,
      (prompt: string, event: SystemEvent) => {
        const task = event.data.task;
        const suggestedStart = `
---
## [INITIALIZATION SEQUENCE]: Task Started
**Task ID:** ${event.id.substring(0, 8)}
**Instruction:** ${task}

**Recommended Sequence:**
1. Parse intent: Determine required modifications
2. Draft implementation plan: Modularize scope
3. Validate preconditions: Check dependencies and environment
4. Execute: Apply changes iteratively
5. Verify: Test modifications against requirements

Focus on extraction of penetrant logic before persistent commitment.
---
        `.trim();

        return `${suggestedStart}\n\n${prompt}`;
      },
    );

    // 6. Tool Success Tracking
    this.registerMiddleware(EventType.TOOL_CALL_SUCCESS, (prompt: string, event: SystemEvent) => {
      // Only apply feedback for critical tools
      if (event.data.tool === 'null') return prompt;

      const efficiency = `
---
## [OPERATIONAL VERIFICATION]: Tool Executed
**Tool:** ${event.data.tool}
**Result:** ${event.data.result ? this.summarizeResult(event.data.result) : 'Completed'}

**Observation:** Tool completed in detached mode. Trigger successful.
**Impact:** Updates applied to authoritative source.
---
        `.trim();

      return `${efficiency}\n\n${prompt}`;
    });
  }

  /**
   * Called when an event occurs during prompt assembly or execution.
   * Applies relevant middleware in reverse-registered order.
   */
  async modifyPromptOnEvent(
    promptBuffer: string,
    eventType: EventType,
    event: SystemEvent,
  ): Promise<string> {
    const modifiers = [...this.middlewareMap.entries()];

    // Filter for relevant modifiers (exact match or wildcard *)
    const relevantModifiers = modifiers.filter(
      ([type]) => type === eventType || (type as string) === '*',
    );

    if (relevantModifiers.length === 0) return promptBuffer;

    // Apply modifiers in reverse insertion order (last registered = highest priority)
    let modifiedPrompt = promptBuffer;

    for (const [eventType, modifier] of relevantModifiers.reverse()) {
      try {
        modifiedPrompt = modifier(modifiedPrompt, event);
      } catch (error) {
        // Log but don't discard prompt
        this.logService.error(`Middleware failed for ${eventType}:`, error, {
          component: 'PromptMiddlewareManager',
        });
      }
    }

    return modifiedPrompt;
  }

  /**
   * POST-COMMIT Prompt Adjustment
   * Hook into EventBus to post-process prompts immediately after LLM response.
   */
  async postProcessLLMResponse(
    originalQuery: string,
    llmResponse: string,
    events: SystemEvent[],
  ): Promise<string> {
    // Remove initial prompt from analysis (focus on response)
    const analysisPrompt = llmResponse;

    // Remove echo from query (if LLM echoed user input)
    const query = originalQuery.replace(/^(?:You are analyzing:|Input:|Query:)\s*/i, '');

    // Cascade through events in reverse chronological order
    let modifiedResponse = analysisPrompt;

    for (const event of events.reverse()) {
      const modifier = this.middlewareMap.get(event.type);
      if (modifier) {
        modifiedResponse = modifier(modifiedResponse, event);
      }
    }

    return modifiedResponse;
  }

  /**
   * INTERNAL: Heuristics for context augmentation
   */
  private extrapolateCapacity(item: any): string {
    if (item.confidence > 0.95) return 'Critical';
    if (item.confidence > 0.8) return 'High';
    if (item.confidence > 0.6) return 'Medium';
    return 'Low';
  }

  private summarizeLearning(item: any): string {
    const keyPart = item.key || item.id || '';
    const valuePart = item.value || item.value.value;

    if (this.lengthOf(valuePart) > 100) {
      return `${valuePart.substring(0, 100)}...`;
    }

    return valuePart;
  }

  private suggestApplication(key: string): string {
    if (key.includes('architecture')) return 'across modules';
    if (key.includes('api')) return 'in integration layer';
    if (key.includes('test')) return 'in test suite';
    if (key.includes('performance')) return 'where latency matters';
    return 'where applicable';
  }

  private renderContextFlags(eventData: any, discoveryType: string): string {
    const flags = [];

    if (discoveryType.includes('incremental')) {
      flags.push('✅ Recent changes indexed');
    }
    if (discoveryType.includes('retrieval')) {
      flags.push('✅ Semantic search active');
    }
    if (eventData.maxFiles) {
      flags.push(`⛔ File stats limited to ${eventData.maxFiles}`);
    }
    if (eventData.optimization === 'aggressive') {
      flags.push('⚡ Pruning applied aggressively');
    }

    return flags.join('\n');
  }

  private summarizeResult(result: any): string {
    if (typeof result === 'string') {
      if (result.length > 50) return `${result.substring(0, 50)}...`;
      return result;
    }

    if (typeof result === 'object' && result.lines) {
      return `${result.lines} line${result.lines > 1 ? 's' : ''} applied`;
    }

    return `${JSON.stringify(result).substring(0, 50)}...`;
  }

  private lengthOf(str: string): number {
    // Simple length calculation
    return str ? str.length : 0;
  }
}
