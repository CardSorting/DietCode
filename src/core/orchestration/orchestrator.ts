/**
 * [LAYER: CORE]
 * Principle: Orchestration — coordinates the entire system workflow
 * Violations: None
 */

import { EventBus } from './EventBus';
import { EventType } from '../../domain/Event';
import type { ExecutionService } from './ExecutionService';
import type { HandoverService } from './HandoverService';
import type { SwarmAuditor } from './SwarmAuditor';

/**
 * Orchestrator configuration options
 */
export interface OrchestratorConfig {
  sessionId?: string;
  maxConcurrency?: number;
  enableSafety?: boolean;
}

/**
 * Orchestrator method — coordinates the high-level orchestration workflow
 * Pattern: Orchestrator Pattern — unified entry point for system operations
 */
export class Orchestrator {
  private eventBus: EventBus;
  private executionService?: ExecutionService;
  private handoverService?: HandoverService;
  private swarmAuditor?: SwarmAuditor;
  private eventData?: { sessionId?: string; maxConcurrency?: number };

  constructor(config?: OrchestratorConfig) {
    this.eventBus = EventBus.getInstance();
    this.eventData = config;
    
    if (config?.maxConcurrency) {
      console.log(`⚙️  Max concurrency: ${config.maxConcurrency}`);
    }
  }

  /**
   * Execute single command input (for backward compatibility)
   * 
   * @param input Command or workflow input
   */
  async run(input: string | any): Promise<any> {
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
  async executeWorkflow<T>(
    workflowInput: T
  ): Promise<any> {
    const correlationId = globalThis.crypto.randomUUID();
    const startTime = Date.now();

    console.log(`🔧 Executing workflow with correlation ID: ${correlationId}`);

    try {
      // Phase 1: Initialize workflow
      this.eventBus.publish(EventType.THINKING_STARTED, {
        input: workflowInput,
        correlationId
      }, { correlationId });

      // Phase 2: Execute orchestration logic
      let result: any;
      if (this.executionService) {
        result = await this.executeCoreWorkflow(workflowInput);
      } else {
        result = await this.executeFallbackWorkflow(workflowInput);
      }

      // Phase 3: Complete workflow
      const executionTime = Date.now() - startTime;
      
      this.eventBus.publish(EventType.THINKING_COMPLETED, {
        result,
        executionTime,
        correlationId
      }, { correlationId });

      console.log(`✅ Workflow completed in ${executionTime}ms`);
      
      return result;

    } catch (workflowError: any) {
      const executionTime = Date.now() - startTime;
      
      this.eventBus.publish(EventType.ERROR_OCCURRED, {
        source: 'Orchestrator',
        message: workflowError.message,
        executionTime
      });

      console.error(`❌ Workflow failed after ${executionTime}ms: ${workflowError.message}`);
      throw workflowError;
    }
  }

  /**
   * Execute core orchestration workflow
   * 
   * @param input Workflow parameters
   */
  private async executeCoreWorkflow<T>(input: T): Promise<any> {
    if (!this.executionService) {
      throw new Error('Execution service not configured');
    }

    // Placeholder for core workflow logic
    // This would involve coordinating EventBus, ExecutionService, and other services
    console.log('🎯 Core workflow execution');

    // Example: Trigger handover if configured
    if (this.handoverService && (input as any)?.triggerHandover) {
      await this.handoverService.executeHandover(
        'default-orchestrator',
        'target-orchestrator'
      );
    }

    return { status: 'completed', input };
  }

  /**
   * Execute fallback orchestration workflow
   * 
   * @param input Workflow parameters
   */
  private async executeFallbackWorkflow<T>(input: T): Promise<any> {
    console.log('⚠️  Fallback execution mode (no dependencies configured)');
    return { status: 'completed', input, fallback: true };
  }

  /**
   * Get Orchestrator diagnostics
   * 
   * @param overrideShell Internal parameter (not used externally)
   */
  getDiagnostics(overrideShell?: never): any {
    return {
      executionService: this.executionService !== undefined,
      handoverService: this.handoverService !== undefined,
      swarmAuditor: this.swarmAuditor !== undefined,
      sessionId: this.eventData?.sessionId,
      currentStage: this.getCurrentStage()
    };
  }

  /**
   * Get current workflow stage (for diagnostics)
   */
  private getCurrentStage(): string {
    return 'initialized';
  }
}