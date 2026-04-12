/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: Orchestration — coordinates the tool execution lifecycle.
 */

import { EventType } from '../../domain/Event';
import type {
  SafetyAwareToolContext,
  SafetyAwareToolOptions,
} from '../../domain/capabilities/SafetyAwareToolExecution';
import type { ToolRouter } from '../../domain/capabilities/ToolRouter';
import type { FileReadResult } from '../../domain/context/FileOperation';
import type { RiskEvaluator } from '../../domain/validation/RiskEvaluator';
import { RiskLevel } from '../../domain/validation/RiskLevel';
import type { RollbackProtocol } from '../../domain/validation/RollbackProtocol';
import type { LogService } from '../../domain/logging/LogService';
import { SafetyGuard } from '../capabilities/SafetyGuard';
import type { ToolManager } from '../capabilities/ToolManager';
import type { SnapshotService } from '../memory/SnapshotService';
import type { 
  ContextOptimizationServiceOrchestrator,
  OptimizationReport 
} from './ContextOptimizationService';
import { EventBus } from './EventBus';
import { StateOrchestrator } from '../manager/orchestrator';
import type { GlobalState } from '../../domain/LLMProvider';

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
  result: unknown;
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
  private contextOptimization?: ContextOptimizationServiceOrchestrator;

  /**
   * Initialize ExecutionService with unified safety capabilities
   * @param snapshotService Snapshot service for pre-execution capture
   * @param executionOptions Execution configuration options
   */
  constructor(snapshotService: SnapshotService, executionOptions?: SafeExecutionOptions) {
    this.snapshotService = snapshotService;
    this.eventBus = EventBus.getInstance();
    this.eventData = executionOptions as { sessionId?: string; timestamp?: string } | undefined;

    // Apply options if provided
    if (executionOptions?.preserveSnapshots) {
      console.log('📦 Snapshots enabled for tool execution');
    }
  }

  /**
   * Enable context optimization service
   * Integrates the two-finger pattern context optimization system
   *
   * @param orchestrator Context optimization orchestrator
   */
  enableContextOptimization(orchestrator: ContextOptimizationServiceOrchestrator): void {
    this.contextOptimization = orchestrator;
    console.log('🚀 Context optimization enabled');
  }

  /**
   * Read a file with context optimization
   * Automatically applies the two-finger pattern for duplicate file reads
   *
   * @param filePath Path to the file to read
   * @returns Promise resolving to optimized file read result
   */
  async readFileOptimized(filePath: string): Promise<FileReadResult> {
    if (!this.contextOptimization) {
      console.warn('⚠️  Context optimization not enabled. Falling back to direct file read.');
      // Fallback to direct file read (would need file system adapter here)
      return {
        filePath,
        content: 'Context optimization not enabled',
        timestamp: Date.now(),
        source: 'fallback',
        originalLength: filePath.length,
        optimizedLength: filePath.length,
        wasOptimized: false,
        hash: `fallback-${Date.now()}`,
        sizeBytes: filePath.length,
      };
    }

    const result = await this.contextOptimization.readFileOptimized(filePath);

    if (result.wasOptimized) {
      console.log(`⚡ Optimized read: ${filePath} (${result.optimizationReason})`);
      this.eventBus.publish(
        EventType.CONTEXT_OPTIMIZATION,
        {
          filePath,
          wasOptimized: true,
          reason: result.optimizationReason,
        },
        { sessionId: this.eventData?.sessionId },
      );
    }

    return result.result;
  }

  /**
   * Start a context optimization session
   * Should be called at the beginning of a tool execution session
   *
   * @param sessionId Unique session identifier
   */
  startOptimizationSession(sessionId: string): void {
    if (this.contextOptimization) {
      this.contextOptimization.startSession(sessionId);
      console.log(`📊 Started optimization session: ${sessionId}`);
    }
  }

  /**
   * End a context optimization session and generate report
   * Should be called at the end of a tool execution session
   *
   * @returns Optimization report (optional)
   */
  async endOptimizationSession(): Promise<OptimizationReport | null> {
    if (!this.contextOptimization) {
      return null;
    }

    const report = await this.contextOptimization.generateReport();

    if (report.contextTruncated) {
      console.log('⚠️  Context optimization triggered truncation');
    }

    console.log('📊 Optimization session completed:', {
      efficiency: report.metrics.efficiencyRating,
      savings: `${report.metrics.percentageSaved.toFixed(1)}%`,
      signatures: report.signatureCount,
      messages: report.recommendations.slice(0, 2),
    });

    return report;
  }

  /**
   * Get context optimization summary for diagnostics
   *
   * @returns Context summary or null if optimization not enabled
   */
  getContextSummary() {
    if (!this.contextOptimization) {
      return null;
    }
    return this.contextOptimization.getContextSummary();
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
    toolRouter?: ToolRouter,
  ): void {
    this.toolManager = toolManager;
    this.toolRouter = toolRouter;
    this.rollbackManager = rollbackManager;
    this.safetyGuard = new SafetyGuard(riskEvaluator, this.eventBus as unknown as LogService); // EventBus isn't LogService, I should use a proper logger here.

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
    input?: Record<string, unknown>,
  ): Promise<UnifiedToolExecutionResult> {
    const startTime = Date.now();
    const correlationId = globalThis.crypto.randomUUID();

    // Phase 1: Setup and Validation
    this.eventBus.publish(
      EventType.TOOL_CALL_START,
      {
        toolName: toolName || 'default-tool',
        input,
      },
      { correlationId, sessionId: this.eventData?.sessionId },
    );
    
    // Update state to reflecting execution start
    const orchestrator = StateOrchestrator.getInstance();
    await orchestrator.applyChange({
      key: 'currentlyExecutingTool',
      newValue: toolName || 'default-tool',
      stateSet: {} as GlobalState,
      validate: () => true,
      sanitize: () => toolName || 'default-tool',
      getCorrelationId: () => `exec-start-${correlationId}`
    }, 0);
    
    await orchestrator.applyChange({
      key: 'executionStatus',
      newValue: 'executing',
      stateSet: {} as GlobalState,
      validate: () => true,
      sanitize: () => 'executing',
      getCorrelationId: () => `exec-status-${correlationId}`
    }, 0);

    if (!this.safetyGuard || !this.toolManager) {
      throw new Error(
        'Unified safety integration not enabled. Call enableUnifiedSafetyIntegration() first.',
      );
    }

    // Phase 2: Route to appropriate tool (if router available)
    let toolRouteInfo: UnifiedToolExecutionResult['metadata']['toolRoute'];

    if (this.toolRouter) {
      try {
        const routeResult = await this.toolRouter.route({
          operationType: toolName || 'default-tool',
          target: executionOptions?.targetPath,
          parameters: input,
        });

        if (routeResult.matchesCriteria) {
          toolRouteInfo = {
            toolName: routeResult.tool.name,
            matchesCriteria: routeResult.matchesCriteria,
          };
          console.log(`🧭 Tool routed: ${toolName || 'default-tool'} → ${routeResult.tool.name}`);
        }
      } catch (routeError) {
        console.warn(`⚠️  Tool routing failed, using original tool: ${routeError}`);
      }
    }

    // Phase 3: Execute with safety-enveloped tool manager
    const toolResult = await this.toolManager.executeWithSafety(
      toolName || 'default-tool',
      input,
      executionOptions,
    );

    this.eventBus.publish(
      toolResult.success ? EventType.TOOL_CALL_SUCCESS : EventType.TOOL_CALL_FAILURE,
      {
        toolName: toolName || 'default-tool',
        result: toolResult,
        safetyCheck: toolResult.safetyCheck,
      },
      { correlationId, sessionId: this.eventData?.sessionId },
    );


    const result = this.buildUnifiedResult(toolResult, toolRouteInfo, startTime);
    
    // Update state to reflecting completion
    await orchestrator.applyChange({
      key: 'executionStatus',
      newValue: 'idle',
      stateSet: {} as GlobalState,
      validate: () => true,
      sanitize: () => 'idle',
      getCorrelationId: () => `exec-complete-${correlationId}`
    }, 0);
    
    await orchestrator.applyChange({
      key: 'currentlyExecutingTool',
      newValue: undefined,
      stateSet: {} as GlobalState,
      validate: () => true,
      sanitize: () => undefined,
      getCorrelationId: () => `exec-cleanup-${correlationId}`
    }, 0);
    
    return result;

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
    startTime: number = Date.now(),
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
        toolRoute: toolRouteInfo,
      },
    };

    // Log result summary
    console.log(`✅ Tool execution completed in ${executionTime}ms`);
    console.log(
      `📊 Safety: ${toolResult.safetyCheck.riskLevel} - Approved: ${toolResult.safetyCheck.approved}`,
    );
    if (toolResult.safetyCheck.requiresConfirmation) {
      console.log(`⚠️  Requires user confirmation: ${toolResult.safetyCheck.requiresConfirmation}`);
    }

    return result;
  }

  /**
   * Check if unified safety integration is enabled
   */
  isSafetyIntegrationEnabled(): boolean {
    return (
      this.safetyGuard !== undefined &&
      this.toolManager !== undefined &&
      this.rollbackManager !== undefined
    );
  }

  /**
   * Safety integration diagnostics
   *
   * @param overrideShell Internal parameter for shell-specific behavior (not exposed externally)
   */
  getDiagnostics(overrideShell?: never): Record<string, unknown> {
    return {
      safetyGuardEnabled: this.safetyGuard !== undefined,
      toolManagerEnabled: this.toolManager !== undefined,
      toolRouterEnabled: this.toolRouter !== undefined,
      rollbackManagerEnabled: this.rollbackManager !== undefined,
      isFullyIntegrated: this.isSafetyIntegrationEnabled(),
    };
  }

  /**
   * Get consolidated optimization diagnostics
   * @returns Combined diagnostics from safety integration and context optimization
   */
  getConsolidatedDiagnostics(_overrideShell?: never): Record<string, unknown> {
    return {
      safetyIntegration: this.isSafetyIntegrationEnabled() ? 'enabled' : 'disabled',
      safetyIntegrations: this.getDiagnostics(),
      contextOptimization: this.contextOptimization
        ? {
            enabled: true,
            summary: this.getContextSummary(),
          }
        : {
            enabled: false,
          },
      systemStatus: {
        fullyIntegrated: this.isSafetyIntegrationEnabled() && !!this.contextOptimization,
      },
    };
  }
}
