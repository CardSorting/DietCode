/**
 * [LAYER: CORE]
 * Principle: Orchestration — coordinates the tool execution lifecycle.
 */

import { EventBus } from './EventBus';
import { SnapshotService } from '../memory/SnapshotService';
import { EventType } from '../../domain/Event';
import { SafetyGuard } from '../capabilities/SafetyGuard';
import { RollbackManager } from '../../infrastructure/validation/RollbackManager';
import type { SafetyAwareToolContext, SafetyAwareToolOptions } from '../../domain/capabilities/SafetyAwareToolExecution';
import type { ToolManager } from '../capabilities/ToolManager';
import { ToolRouter } from '../../domain/capabilities/ToolRouter';
import { RiskEvaluator } from '../../domain/validation/RiskEvaluator';

/**
 * Safe tool execution options
 */
export interface SafeExecutionOptions {
  targetPath?: string;
  requireApprovalForHighRisk?: boolean;
  backupBeforeModification?: boolean;
  autoBackup?: boolean;
  preserveSnapshots?: boolean;
}

/**
 * Unified tool execution result with safety envelope
 */
export type UnifiedToolExecutionResult = {
  toolName: string;
  result: any;
  success: boolean;
  riskLevel: string;
  approved: boolean;
  safeguardsApplied: string[];
  executionTime: number;
  metadata: {
    toolRoute?: { toolName: string; matchesCriteria: boolean };
    snapshotId?: string;
  };
};

/**
 * ExecutionService orchestrates tool execution with unified SafetyGuard integration
 * Pattern: Modern Unified Safety - single SafetyGuard instance wraps all tool executions
 */
export class ExecutionService {
  private safetyGuard?: SafetyGuard;
  private rollbackManager?: RollbackManager;
  private toolManager?: ToolManager;
  private toolRouter?: ToolRouter;
  private eventBus: EventBus;
  private snapshotService: SnapshotService;

  /**
   * Initialize ExecutionService with unified safety capabilities
   * @param eventBus Event bus for lifecycle events
   * @param snapshotService Snapshot service for pre-execution capture
   * @param executionOptions Execution configuration options
   */
  constructor(
    eventBus: EventBus,
    snapshotService: SnapshotService,
    executionOptions?: SafeExecutionOptions
  ) {
    this.eventBus = eventBus;
    this.snapshotService = snapshotService;
    
    // Apply options if provided
    if (executionOptions?.preserveSnapshots) {
      console.log('📦 Snapshots enabled for tool execution');
    }
  }

  /**
   * Enable unified SafetyGuard and ToolManager integration
   * Pattern: Gatekeeper Pattern - all tool executions pass through SafetyGuard
   * 
   * @param riskEvaluator Risk evaluation engine from Domain
   * @param rollbackManager Backup/rollback manager from Infrastructure
   * @param toolManager Tool manager for tool execution
   * @param toolRouter Optional tool routing for smart tool selection
   */
  enableUnifiedSafetyIntegration(
    riskEvaluator: RiskEvaluator,
    rollbackManager: RollbackManager,
    toolManager: ToolManager,
    toolRouter?: ToolRouter
  ): void {
    this.toolManager = toolManager;
    this.toolRouter = toolRouter;
    this.rollbackManager = rollbackManager;
    this.safetyGuard = new SafetyGuard(riskEvaluator, rollbackManager);

    console.log('🛡️  Unified SafetyGuard integration enabled');
    console.log('🔧 Tool routing:', toolRouter ? 'Enabled' : 'Disabled');
    console.log('📦 Snapshots:', this.snapshotService ? 'Enabled' : 'Disabled');
  }

  /**
   * Execute a tool with unified safety envelope
   * Pattern: Safety-Instrumented Execution - wraps tool execution with full safety envelope
   * 
   * @param toolName Name of the tool to execute
   * @param input Parameters for tool execution
   * @param options Configuration options for safety behavior
   * @returns Promise resolving to unified execution result with safety metadata
   */
  async executeWithUnifiedSafety<T>(
    toolName: string,
    input: T,
    options: SafetyAwareToolOptions = {}
  ): Promise<UnifiedToolExecutionResult> {
    const startTime = Date.now();
    const correlationId = globalThis.crypto.randomUUID();
    
    // Phase 1: Setup and Validation
    this.eventBus.publish(EventType.TOOL_CALL_START, { toolName, input }, { correlationId });

    if (!this.safetyGuard || !this.toolManager) {
      throw new Error(
        'Unified safety integration not enabled. Call enableUnifiedSafetyIntegration() first.'
      );
    }

    // Phase 2: Route to appropriate tool (if router available)
    let finalToolName = toolName;
    let toolRouteInfo: UnifiedToolExecutionResult['metadata']['toolRoute'];

    if (this.toolRouter) {
      try {
        const routeResult = await this.toolRouter.route({
          operationType: toolName,
          target: options.targetPath,
          parameters: input as Record<string, any>
        });

        if (routeResult.matchesCriteria) {
          finalToolName = routeResult.tool.name;
          toolRouteInfo = {
            toolName: routeResult.tool.name,
            matchesCriteria: routeResult.matchesCriteria,
            overrideShell: routeResult.overrideShell
          };
          console.log(`🧭 Tool routed: ${toolName} → ${finalToolName}`);
        }
      } catch (routeError) {
        console.warn(`⚠️  Tool routing failed, using original tool: ${routeError}`);
      }
    }

    // Phase 3: Execute with safety-enveloped tool manager
    let toolResult: any;
    try {
      toolResult = await this.toolManager.executeWithSafety(
        finalToolName,
        input,
        options
      );
      
      this.eventBus.publish(
        toolResult.success ? EventType.TOOL_CALL_SUCCESS : EventType.TOOL_CALL_FAILURE,
        { 
          toolName: finalToolName,
          result: toolResult,
          safetyCheck: toolResult.safetyCheck
        },
        { correlationId }
      );
      
      return this.buildUnifiedResult(
        toolResult,
        toolRouteInfo,
        startTime,
        correlationId
      );

    } catch (toolExecutionError: any) {
      const executionTime = Date.now() - startTime;
      
      // Phase 4: Error handling with safety envelope
      console.error(`❌ Tool execution failed: ${toolExecutionError.message}`);
      this.eventBus.publish(
        EventType.TOOL_CALL_FAILURE,
        { 
          toolName: finalToolName, 
          error: toolExecutionError.message 
        },
        { correlationId }
      );

      // Attempt rollback if safety guard was configured
      if (options.targetPath && this.safetyGuard) {
        console.log(`♻️  Attempting rollback for ${options.targetPath}...`);
        try {
          await (this.rollbackManager as any).rollbackByPath(options.targetPath);
          console.log(`✅ Rollback completed`);
        } catch (rollbackError) {
          console.error(`💥 Rollback failed: ${rollbackError}`);
        }
      }

      return this.buildUnifiedResult(
        {
          toolName: finalToolName,
          toolResult: {
            content: `Tool execution failed: ${toolExecutionError.message}`,
            isError: true
          },
          success: false,
          safetyCheck: {
            evaluated: true,
            riskLevel: 'HIGH',
            approved: false,
            requiresConfirmation: false,
            rollbackPrepared: false,
            safeguardsApplied: ['Tool execution failed', `Error: ${toolExecutionError.message}`]
          },
          execution: {
            startTime,
            endTime: Date.now(),
            durationMs: Date.now() - startTime
          }
        },
        toolRouteInfo,
        startTime,
        correlationId
      );
    }
  }

  /**
   * Build unified execution result from tool context
   */
  private buildUnifiedResult(
    toolResult: SafetyAwareToolContext,
    toolRouteInfo?: UnifiedToolExecutionResult['metadata']['toolRoute'],
    startTime: number,
    correlationId: string
  ): UnifiedToolExecutionResult {
    const executionTime = Date.now() - startTime;

    const result: UnifiedToolExecutionResult = {
      toolName: toolResult.toolName,
      result: toolResult.toolResult,
      success: toolResult.success,
      riskLevel: toolResult.safetyCheck.riskLevel,
      approved: toolResult.safetyCheck.approved,
      safeguardsApplied: toolResult.safetyCheck.safeguardsApplied,
      executionTime,
      metadata: {
        toolRoute: toolRouteInfo
      }
    };

    // Log result summary
    console.log(`✅ Tool execution completed in ${executionTime}ms`);
    console.log(`📊 Safety: ${toolResult.safetyCheck.riskLevel} - Approved: ${toolResult.safetyCheck.approved}`);
    if (toolResult.safetyCheck.requiresConfirmation) {
      console.log(`⚠️  Requires user confirmation: ${toolResult.safetyCheck.requiresConfirmation}`);
    }

    return result;
  }

  /**
   * Check if unified safety integration is enabled
   */
  isSafetyIntegrationEnabled(): boolean {
    return this.safetyGuard !== undefined && 
           this.toolManager !== undefined &&
           this.rollbackManager !== undefined;
  }

  /**
   * Get current risk level for a tool operation
   */
  async getRiskLevel(operationType: string, parameters?: Record<string, any>): Promise<string> {
    if (!this.safetyGuard) {
      throw new Error('Safety integration not enabled');
    }

    const criteria = {
      operationType,
      parameters,
      targetPath: parameters?.path
    };

    const { riskLevel } = await this.safetyGuard.canProceed(criteria);
    return riskLevel;
  }

  /**
   * Safety integration diagnostics
   */
  getDiagnostics() {
    return {
      safetyGuardEnabled: this.safetyGuard !== undefined,
      toolManagerEnabled: this.toolManager !== undefined,
      toolRouterEnabled: this.toolRouter !== undefined,
      rollbackManagerEnabled: this.rollbackManager !== undefined,
      isFullyIntegrated: this.isSafetyIntegrationEnabled()
    };
  }
}