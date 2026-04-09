/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: Orchestration — coordinates the entire system workflow
 * Violations: None
 */

import { EventType } from '../../domain/Event';
import type { LLMProvider } from '../../domain/LLMProvider';
import type { ProjectContext } from '../../domain/context/ProjectContext';
import type { SessionRepository } from '../../domain/context/SessionRepository';
import type { DecisionRepository } from '../../domain/memory/DecisionRepository';
import type { AuditProvider } from '../../domain/system/AuditProvider';
import { ICONS } from '../../ui/design/Theme';
import type { TerminalUI } from '../../ui/terminal';
import type { AgentRegistry } from '../capabilities/AgentRegistry';
import type { CommandProcessor } from '../capabilities/CommandProcessor';
import type { ToolManager } from '../capabilities/ToolManager';
import type { AttachmentResolver } from '../context/AttachmentResolver';
import type { ContextPruner } from '../context/ContextPruner';
import type { ContextService } from '../context/ContextService';
import type { Ignorer } from '../context/Ignorer';
import type { MemoryService } from '../memory/MemoryService';
import { EventBus } from './EventBus';
import type { ExecutionService } from './ExecutionService';
import type { HandoverService } from './HandoverService';
import type { SwarmAuditor } from './SwarmAuditor';

export class Orchestrator {
  private eventBus: EventBus;
  private executionService?: ExecutionService;
  private handoverService?: HandoverService;
  private swarmAuditor?: SwarmAuditor;

  constructor(
    private provider: LLMProvider,
    private ui: TerminalUI,
    private toolManager: ToolManager,
    private commandProcessor: CommandProcessor,
    private repository: SessionRepository,
    private decisions: DecisionRepository,
    private audit: AuditProvider,
    private agentRegistry: AgentRegistry,
    private contextService: ContextService,
    private attachmentResolver: AttachmentResolver,
    private contextPruner: ContextPruner,
    private ignorer: Ignorer,
    private projectContext?: ProjectContext,
    private memoryService?: MemoryService,
    private userName = 'Sovereign Administrator',
  ) {
    this.eventBus = EventBus.getInstance();
  }

  async run(input: string): Promise<unknown> {
    this.updateHud();
    return this.executeWorkflow(input);
  }

  private updateHud() {
    this.ui.renderHud({
      agentId: 'Claude 3.7',
      projectName: this.projectContext?.repository?.name || 'DietCode',
      userName: this.userName,
      health: 0.92,
      activeTask: 'Analyzing Sovereign Hive',
    });
  }

  async executeWorkflow<T>(workflowInput: T): Promise<unknown> {
    const correlationId = globalThis.crypto.randomUUID();
    const startTime = Date.now();

    this.ui.drawBox(
      `DIAGNOSTIC - CORRELATION: ${correlationId}`,
      'Workflow Execution Initializing...',
      'gray',
    );

    try {
      this.eventBus.publish(
        EventType.THINKING_STARTED,
        {
          input: workflowInput,
          correlationId,
        },
        { correlationId },
      );

      let result: unknown;
      if (this.executionService) {
        result = await this.executeCoreWorkflow(workflowInput);
      } else {
        result = await this.executeFallbackWorkflow(workflowInput);
      }

      const executionTime = Date.now() - startTime;

      this.eventBus.publish(
        EventType.THINKING_COMPLETED,
        {
          result,
          executionTime,
          correlationId,
        },
        { correlationId },
      );

      this.ui.drawBox(
        `SYSTEM ${ICONS.CHECK}`,
        `Sovereign Operation Completed in ${executionTime}ms`,
        'green',
      );

      return result;
    } catch (workflowError: unknown) {
      const error = workflowError as Error;
      const executionTime = Date.now() - startTime;

      this.eventBus.publish(EventType.ERROR_OCCURRED, {
        source: 'Orchestrator',
        message: error.message,
        executionTime,
      });

      this.ui.drawBox(
        `SYSTEM ${ICONS.CROSS}`,
        `Sovereign Failure after ${executionTime}ms: ${error.message}`,
        'red',
      );
      throw workflowError;
    }
  }

  /**
   * Execute core orchestration workflow
   *
   * @param input Workflow parameters
   */
  private async executeCoreWorkflow<T>(input: T): Promise<unknown> {
    if (!this.executionService) {
      throw new Error('Execution service not configured');
    }

    // Placeholder for core workflow logic
    // This would involve coordinating EventBus, ExecutionService, and other services
    console.log('🎯 Core workflow execution');

    // Example: Trigger handover if configured
    const handoverTrigger = (input as Record<string, unknown> & { triggerHandover?: boolean })
      ?.triggerHandover;
    if (this.handoverService && handoverTrigger) {
      await this.handoverService.executeHandover('default-orchestrator', 'target-orchestrator');
    }

    return { status: 'completed', input };
  }

  /**
   * Execute fallback orchestration workflow
   *
   * @param input Workflow parameters
   */
  private async executeFallbackWorkflow<T>(input: T): Promise<unknown> {
    console.log('⚠️  Fallback execution mode (no dependencies configured)');
    return { status: 'completed', input, fallback: true };
  }

  /**
   * Get Orchestrator diagnostics
   *
   * @param overrideShell Internal parameter (not used externally)
   */
  getDiagnostics(overrideShell?: never): Record<string, boolean | string> {
    return {
      executionService: this.executionService !== undefined,
      handoverService: this.handoverService !== undefined,
      swarmAuditor: this.swarmAuditor !== undefined,
      currentStage: this.getCurrentStage(),
    };
  }

  /**
   * Get current workflow stage (for diagnostics)
   */
  private getCurrentStage(): string {
    return 'initialized';
  }
}
