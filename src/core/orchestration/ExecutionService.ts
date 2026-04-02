/**
 * [LAYER: CORE]
 * Principle: Orchestration — coordinates the tool execution lifecycle.
 */

import { EventBus } from './EventBus';
import { SnapshotService } from '../memory/SnapshotService';
import { EventType } from '../../domain/Event';
import { SafetyGuard } from '../capabilities/SafetyGuard';
import type { RollbackProtocol } from '../../domain/validation/RollbackProtocol';
import type { SafetyAwareToolContext, SafetyAwareToolOptions } from '../../domain/capabilities/SafetyAwareToolExecution';
import type { ToolManager } from '../capabilities/ToolManager';
import type { ToolRouter } from '../../domain/capabilities/ToolRouter';
import type { RiskEvaluator } from '../../domain/validation/RiskEvaluator';
import { RiskLevel } from '../../domain/validation/RiskLevel';

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
  private rollbackManager?: RollbackProtocol;
  private toolManager?: ToolManager;
  private toolRouter?: ToolRouter;
  private eventBus: EventBus;
  private snapshotService: SnapshotService;
  private eventData?: { sessionId?: string; timestamp?: string };

  /**
   * Initialize ExecutionService with unified safety capabilities
   * @param snapshotService Snapshot service for pre-execution capture
   * @param executionOptions Execution configuration options
   */
  constructor(
    snapshotService: SnapshotService,
    executionOptions?: SafeExecutionOptions
  ) {
    this.snapshotService = snapshotService;
    this.eventBus = EventBus.getInstance();
    this.eventData = executionOptions as { sessionId?: string; timestamp?: string } | undefined;
    
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
   * @param rollbackManager Backup/rollback manager (implements RollbackProtocol)
   * @param toolManager Tool manager for tool execution
   * @param toolRouter Optional tool routing for smart tool selection
   */
  enableUnifiedSafetyIntegration(
    riskEvaluator: RiskEvaluator,
    rollbackManager: RollbackProtocol,
    toolManager: ToolManager,
    toolRouter?: ToolRouter
  ): void {
    this.toolManager = toolManager;
    this.toolRouter = toolRouter;
    this.rollbackManager = rollbackManager;
    this.safetyGuard = new SafetyGuard(riskEvaluator);

    console.log('🛡️  Unified SafetyGuard integration enabled');
    console.log('🔧 Tool routing:', toolRouter ? 'Enabled' : 'Disabled');
    console.log('📦 Snapshots:', this.snapshotService ? 'Enabled' : 'Disabled');
  }

  /**
   * Execute a tool with unified safety envelope
   * Pattern: Safety-Instrumented Execution - wraps tool execution with full safety envelope
   * 
   * @param executionOptions Safety configuration options
   * @param toolName Optional tool name
   * @param input Optional input parameters
   * @returns Promise resolving to unified execution result with safety metadata
   */
  async executeWithUnifiedSafety(
    executionOptions?: SafeExecutionOptions,
    toolName?: string,
    input?: Record<string, any>
  ): Promise<UnifiedToolExecutionResult> {
    const startTime = Date.now();
    const correlationId = globalThis.crypto.randomUUID();
    
    // Phase 1: Setup and Validation
    this.eventBus.publish(EventType.TOOL_CALL_START, { 
      toolName: toolName || 'default-tool', 
      input 
    }, { correlationId, sessionId: this.eventData?.sessionId });

    if (!this.safetyGuard || !this.toolManager) {
      throw new Error(
        'Unified safety integration not enabled. Call enableUnifiedSafetyIntegration() first.'
      );
    }

    // Phase 2: Route to appropriate tool (if router available)
    let toolRouteInfo: UnifiedToolExecutionResult['metadata']['toolRoute'];

    if (this.toolRouter) {
      try {
        const routeResult = await this.toolRouter.route({
          operationType: toolName || 'default-tool',
          target: executionOptions?.targetPath,
          parameters: input
        });

        if (routeResult.matchesCriteria) {
          toolRouteInfo = {
            toolName: routeResult.tool.name,
            matchesCriteria: routeResult.matchesCriteria
          };
          console.log(`🧭 Tool routed: ${toolName || 'default-tool'} → ${routeResult.tool.name}`);
        }
      } catch (routeError) {
        console.warn(`⚠️  Tool routing failed, using original tool: ${routeError}`);
      }
    }

    // Phase 3: Execute with safety-enveloped tool manager
    let toolResult: any;
    try {
      toolResult = await this.toolManager.executeWithSafety(
        toolName || 'default-tool',
        input,
        executionOptions
      );
      
      this.eventBus.publish(
        toolResult.success ? EventType.TOOL_CALL_SUCCESS : EventType.TOOL_CALL_FAILURE,
        { 
          toolName: toolName || 'default-tool',
          result: toolResult,
          safetyCheck: toolResult.safetyCheck
        },
        { correlationId, sessionId: this.eventData?.sessionId }
      );
      
      return this.buildUnifiedResult(
        toolResult,
        toolRouteInfo,
        startTime
      );

    } catch (toolExecutionError: any) {
      const executionTime = Date.now() - startTime;
      
      // Phase 4: Error handling with safety envelope
      console.error(`❌ Tool execution failed: ${toolExecutionError.message}`);
      this.eventBus.publish(
        EventType.TOOL_CALL_FAILURE,
        { 
          toolName: toolName || 'default-tool', 
          error: toolExecutionError.message 
        },
        { correlationId }
      );

      // Attempt rollback if safety guard was configured
      if (executionOptions?.targetPath && this.safetyGuard) {
        console.log(`♻️  Attempting rollback for ${executionOptions.targetPath}...`);
        try {
          await (this.rollbackManager as any).rollbackByPath(executionOptions.targetPath);
          console.log(`✅ Rollback completed`);
        } catch (rollbackError) {
          console.error(`💥 Rollback failed: ${rollbackError}`);
        }
      }

      return this.buildUnifiedResult(
        {
          toolName: toolName || 'default-tool',
          toolResult: {
            content: `Tool execution failed: ${toolExecutionError.message}`,
            isError: true
          },
          success: false,
          safetyCheck: {
            evaluated: true,
            riskLevel: RiskLevel.HIGH,
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
        startTime
      );
    }
  }

  /**
   * Build unified execution result from tool context
   * 
   * @param toolResult Tool execution result from SafetyGuard
   * @param toolRouteInfo Optional routing information
   * @param startTime Execution start time
   * @returns Unified execution result
   */
  private buildUnifiedResult(
    toolResult: SafetyAwareToolContext,
    toolRouteInfo?: UnifiedToolExecutionResult['metadata']['toolRoute'],
    startTime: number = Date.now()
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
   * Safety integration diagnostics
   * 
   * @param overrideShell Internal parameter for shell-specific behavior (not exposed externally)
   */
  getDiagnostics(overrideShell?: never): any {
    return {
      safetyGuardEnabled: this.safetyGuard !== undefined,
      toolManagerEnabled: this.toolManager !== undefined,
      toolRouterEnabled: this.toolRouter !== undefined,
      rollbackManagerEnabled: this.rollbackManager !== undefined,
      isFullyIntegrated: this.isSafetyIntegrationEnabled()
    };
  }
}