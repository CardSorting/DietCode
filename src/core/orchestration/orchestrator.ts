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

/**
 * Orchestrator method — coordinates the high-level orchestration workflow
 * Pattern: Orchestrator Pattern — unified entry point for system operations
 *
 * Domain-first: Orchestrator aggregates Core layer services for coordinated execution
 */
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
  ) {
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Execute single command input (for backward compatibility)
   *
   * @param input Command or workflow input
   */
  async run(input: string): Promise<unknown> {
    return this.executeWorkflow(input);
  }

  /**
   * Set up execution service
   *
   * @param service ExecutionService instance
   */
  setExecutionService(service: ExecutionService): void {
    this.executionService = service;
  }

  /**
   * Set up handover service
   *
   * @param service HandoverService instance
   */
  setHandoverService(service: HandoverService): void {
    this.handoverService = service;
  }

  /**
   * Set up swarm auditor
   *
   * @param auditor SwarmAuditor instance
   */
  setSwarmAuditor(auditor: SwarmAuditor): void {
    this.swarmAuditor = auditor;
  }

  /**
   * Execute unified orchestration workflow
   *
   * @param workflowInput Workflow execution parameters
   * @returns Promise resolving to orchestration result
   */
  async executeWorkflow<T>(workflowInput: T): Promise<unknown> {
    const correlationId = globalThis.crypto.randomUUID();
    const startTime = Date.now();

    console.log(`🔧 Executing workflow with correlation ID: ${correlationId}`);

    try {
      // Phase 1: Initialize workflow
      this.eventBus.publish(
        EventType.THINKING_STARTED,
        {
          input: workflowInput,
          correlationId,
        },
        { correlationId },
      );

      // Phase 2: Execute orchestration logic
      let result: unknown;
      if (this.executionService) {
        result = await this.executeCoreWorkflow(workflowInput);
      } else {
        result = await this.executeFallbackWorkflow(workflowInput);
      }

      // Phase 3: Complete workflow
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

      console.log(`✅ Workflow completed in ${executionTime}ms`);

      return result;
    } catch (workflowError: unknown) {
      const error = workflowError as Error;
      const executionTime = Date.now() - startTime;

      this.eventBus.publish(EventType.ERROR_OCCURRED, {
        source: 'Orchestrator',
        message: error.message,
        executionTime,
      });

      console.error(`❌ Workflow failed after ${executionTime}ms: ${error.message}`);
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
