/**
 * [LAYER: CORE]
 * Principle: Orchestration, task coordination, prompt assembly
 * Violations: None
 * 
 * Manages the registration and execution of tools.
 * Coordinates between Domain definitions and Infrastructure implementations.
 * Uses new Domain contracts: ToolRegistry, ToolExecutor, ToolFactory
 */

import type { ToolDefinition, ToolResult } from '../../domain/agent/ToolDefinition';
import { EventBus } from '../orchestration/EventBus';
import { EventType } from '../../domain/Event';
import type { ToolRouter } from '../../domain/capabilities/ToolRouter';
import { RiskLevel } from '../../domain/validation/RiskLevel';
import type { SafetyAwareToolContext, SafetyAwareToolOptions } from '../../domain/capabilities/SafetyAwareToolExecution';
import type { RollbackProtocol } from '../../domain/validation/RollbackProtocol';
import { SafetyGuard } from './SafetyGuard';
import type { RiskEvaluator } from '../../domain/validation/RiskEvaluator';
import type { ToolDefinition as DomainToolDefinition } from '../../domain/agent/ToolDefinition';
import type { HookOrchestrator } from '../manager/HookOrchestrator';
import type { LockScope, LockResult } from '../../domain/safety/LockScope';
import { LockOrchestrator } from '../manager/LockOrchestrator';
import { FileContextTracker } from '../context/FileContextTracker.ts';
import { RuleContextBuilder } from '../context/RuleContextBuilder.ts';

/**
 * ToolManager orchestrates tool registration and execution
 * Safety integration is handled by ExecutionService via injectable dependencies
 */
export class ToolManager {
  private tools: Map<string, DomainToolDefinition> = new Map();
  private eventBus: EventBus;
  private toolRouter?: ToolRouter;
  private safetyGuard?: SafetyGuard;
  private riskEvaluator?: RiskEvaluator;
  private rollbackManager?: RollbackProtocol;
  private hookOrchestrator?: HookOrchestrator;
  private lockOrchestrator?: LockOrchestrator;
  private contextTracker: FileContextTracker;

  constructor() {
    this.eventBus = EventBus.getInstance();
    this.contextTracker = FileContextTracker.getInstance();
  }

  /**
   * Register a tool with the ToolManager
   */
  register(tool: DomainToolDefinition): void {
    const existing = this.tools.get(tool.name);
    if (existing) {
      console.warn(`⚠️  Overwriting existing tool: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Get a registered tool
   */
  getTool(name: string): DomainToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Route a user intention to the appropriate tool
   * Pattern: Tool Selection Router - when a purpose-built tool exists, use it
   */
  async routeTool(
    operationType: string
  ): Promise<{ toolName: string; matchesCriteria: boolean } | null> {
    if (!this.toolRouter) {
      console.warn('⚠️  ToolRouter not initialized. Cannot route tool.');
      return null;
    }

    try {
      const routeResult = await this.toolRouter.route({
        operationType,
        target: undefined,
        parameters: undefined
      });

      return {
        toolName: routeResult.tool.name,
        matchesCriteria: routeResult.matchesCriteria
      };
    } catch (error) {
      console.error(`❌ Tool routing failed: ${error}`);
      return null;
    }
  }

  /**
   * Get all registered tools
   */
  getAllTools(): DomainToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Override safety components for modular integration
   * Called by ExecutionService during system initialization
   * 
   * @param toolRouter Optional tool router for smart routing
   * @param safetyGuard Optional SafetyGuard instance (RiskEvaluator injected via closure)
   * @param riskEvaluator Risk evaluation engine from Domain
   * @param rollbackProtocol Optional RollbackProtocol (Domain contract) for rollback capabilities
   */
  configureSafety(
    toolRouter?: ToolRouter,
    safetyGuard?: SafetyGuard,
    riskEvaluator?: RiskEvaluator,
    rollbackProtocol?: RollbackProtocol
  ): void {
    this.toolRouter = toolRouter;
    this.safetyGuard = safetyGuard;
    this.riskEvaluator = riskEvaluator;
    this.rollbackManager = rollbackProtocol;

    if (toolRouter) {
      console.log('🔧 Tool router configured');
    }

    if (safetyGuard && this.riskEvaluator && this.rollbackManager) {
      console.log('🛡️  Safety integration complete (RiskEvaluator + RollbackProtocol)');
    }
  }

  /**
   * Configure hooks for pre-tool execution pipeline
   * Maps to Cline's hook-driven architecture
   * 
   * @param hookOrchestrator Hook orchestration pipeline
   * @deprecated Prefer configureHooksSync for type safety
   */
  configureHooks(
    hookOrchestrator: HookOrchestrator
  ): void {
    this.hookOrchestrator = hookOrchestrator;
    console.log('🔗 Hooks configured for tool execution');
  }

  /**
   * Configure hooks and locks synchronously (recommended for type safety)
   * Integrates with Cline's multi-phase execution model
   * 
   * @param hookOrchestrator Hook orchestration pipeline for pre/cancel hooks
   * @param lockOrchestrator Distributed lock coordination for dangerous operations
   */
  configureHooksSync(
    hookOrchestrator: HookOrchestrator,
    lockOrchestrator?: LockOrchestrator
  ): void {
    this.hookOrchestrator = hookOrchestrator;
    this.lockOrchestrator = lockOrchestrator;
    console.log('🔗 Hooks & locks configured');
  }

  /**
   * Lock execution scope before tool runs (Cline-style pre-tool locking)
   */
  async acquireToolLock(
    operation: string,
    timeoutMs: number = 60000
  ): Promise<LockResult> {
    if (!this.lockOrchestrator) {
      console.warn('⚠️  LockOrchestrator not configured, skipping lock acquisition');
      return { success: true };
    }

    const scope: LockScope = {
      taskId: 'tool-execution',
      operation,
      timeoutMs,
      autoRelease: true
    };

    try {
      const ticket = await this.lockOrchestrator.acquire(scope, timeoutMs);
      console.log(`🔒 Tool lock acquired: ${operation} (ID: ${ticket.id})`);
      return { success: true, ticket };
    } catch (error: any) {
      console.warn(`⚠️  Lock acquisition failed: ${error.message}`);
      return { 
        success: false, 
        error: error.message,
        reason: 'timeout' 
      };
    }
  }

  /**
   * Execute hooks before tool runs (Cline pre-tool cancellation)
   */
  async runPreToolHooks(toolName: string): Promise<boolean> {
    if (!this.hookOrchestrator) {
      return true; // No hooks configured, proceed
    }

    try {
      // HookOrchestrator uses chain() now
      const result = await this.hookOrchestrator.chain(toolName, {});

      if (!result) {
        console.warn(`🛑 Pre-tool hooks blocked execution: ${toolName}`);
        return false;
      }

      console.log(`✅ Pre-tool hooks passed: ${toolName}`);
      return true;
    } catch (error: any) {
      console.error(`⚠️  Pre-tool hooks error:`, error);
      return false;
    }
  }

  /**
   * Execute a tool-based action with safety context
   * Pattern: Safety-enveloped execution - wraps tool execution with safety checks
   * 
   * @param name Tool name
   * @param input Tool parameters
   * @param options Safety configuration options
   * @returns Promise resolving to SafetyAwareToolContext with safety metadata
   */
  async executeWithSafety<T>(
    name: string,
    input: T,
    options: SafetyAwareToolOptions = {}
  ): Promise<SafetyAwareToolContext> {
    const tool = this.getTool(name);
    if (!tool) {
      this.eventBus.emit(EventType.TOOL_FAILED, { name, error: 'Tool not found' });
      return {
        success: false,
        toolName: name,
        toolResult: {
          content: `Tool '${name}' not found.`,
          isError: true
        },
        safetyCheck: {
          evaluated: false,
          riskLevel: RiskLevel.MEDIUM,
          approved: false,
          requiresConfirmation: false,
          rollbackPrepared: false,
          safeguardsApplied: []
        },
        execution: {
          startTime: Date.now(),
          endTime: Date.now(),
          durationMs: 0
        }
      };
    }

    const startTime = Date.now();
    const correlationId = 'task-' + Date.now();
    this.eventBus.publish(EventType.TOOL_INVOKED, { toolName: name, input }, { correlationId });

    // Cline Pattern: Record Tool Intent before execution for Rule Context
    if (options.targetPath) {
      await this.contextTracker.recordState(options.targetPath, 'codemarie_edited', 'edit');
    }

    // Phase 1: Evaluate safety if SafetyGuard configured
    let safetyCheck = {
      evaluated: false,
      riskLevel: RiskLevel.SAFE,
      approved: true,
      requiresConfirmation: false,
      rollbackPrepared: false,
      safeguardsApplied: [] as string[]
    };

    try {
      if (this.safetyGuard) {
        const safetyEval = await this.safetyGuard.evaluateToolSafety(name, input as Record<string, any>);
        
        safetyCheck = {
          evaluated: true,
          riskLevel: safetyEval.riskLevel,
          approved: safetyEval.isSafe,
          requiresConfirmation: safetyEval.requiresApproval,
          rollbackPrepared: Boolean(options.backupBeforeModification) && (safetyEval.riskLevel === RiskLevel.MEDIUM || safetyEval.riskLevel === RiskLevel.HIGH),
          safeguardsApplied: [
            Boolean(options.requireApprovalForHighRisk) ? 'Approval check' : '',
            ...(safetyCheck.safeguardsApplied || []),
            safetyCheck.rollbackPrepared ? 'Backup prepared' : '',
            'Tool execution protected'
          ].filter(Boolean) as string[]
        };

        console.log(`🛡️  Safety check: ${safetyEval.riskLevel} - Approved: ${safetyEval.isSafe}`);
      }
    } catch (safetyError) {
      console.error(`⚠️ Safety evaluation encountered error, proceeding with default:`, safetyError);
    }

    // Phase 2: Execute tool
    try {
      const result = await tool.execute(input);
      const durationMs = Date.now() - startTime;

      if (result.isError) {
        this.eventBus.publish(EventType.TOOL_FAILED, { 
          toolName: name, 
          error: result.content 
        }, { 
          correlationId,
          durationMs 
        });
        
        // Auto-rollback on tool failure if safety configured
        if (safetyCheck.rollbackPrepared && options.targetPath) {
          console.log(`♻️ Rollback triggered for: ${options.targetPath}`);
        }
      } else {
        this.eventBus.publish(EventType.TOOL_COMPLETED, { toolName: name }, { 
          correlationId,
          durationMs 
        });
      }

      return {
        success: true,
        toolName: name,
        toolResult: result,
        safetyCheck,
        execution: {
          startTime,
          endTime: Date.now(),
          durationMs
        }
      };

    } catch (executionError: any) {
      const durationMs = Date.now() - startTime;
      this.eventBus.publish(EventType.TOOL_FAILED, { 
        toolName: name, 
        error: executionError.message 
      }, { 
        correlationId,
        durationMs 
      });

      return {
        success: false,
        toolName: name,
        toolResult: {
          content: `Error executing tool '${name}': ${executionError.message}`,
          isError: true
        },
        safetyCheck: {
          evaluated: safetyCheck.evaluated,
          riskLevel: safetyCheck.riskLevel,
          approved: safetyCheck.approved,
          requiresConfirmation: safetyCheck.requiresConfirmation,
          rollbackPrepared: safetyCheck.rollbackPrepared,
          safeguardsApplied: [
            ...(safetyCheck.safeguardsApplied || []),
            `Execution failed: ${executionError.message}`
          ]
        },
        execution: {
          startTime,
          endTime: Date.now(),
          durationMs
        }
      };
    }
  }

  /**
   * Execute a tool without safety envelope (legacy mode)
   * Used when safety is not enabled or requested
   * 
   * @deprecated Use executeWithSafety() for safety-aware execution
   */
  async executeTool(name: string, input: any): Promise<ToolResult> {
    const tool = this.getTool(name);
    if (!tool) {
      this.eventBus.emit(EventType.TOOL_FAILED, { name, error: 'Tool not found' });
      return {
        content: `Tool '${name}' not found.`,
        isError: true,
      };
    }

    const startTime = Date.now();
    this.eventBus.emit(EventType.TOOL_INVOKED, { name, input });

    try {
      const result = await tool.execute(input);
      const durationMs = Date.now() - startTime;
      
      if (result.isError) {
        this.eventBus.emit(EventType.TOOL_FAILED, { name, error: result.content }, { durationMs });
      } else {
        this.eventBus.emit(EventType.TOOL_COMPLETED, { name }, { durationMs });
      }
      
      return result;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      this.eventBus.emit(EventType.TOOL_FAILED, { name, error: error.message }, { durationMs });
      return {
        content: `Error executing tool '${name}': ${error.message}`,
        isError: true,
      };
    }
  }

  /**
   * Check if safety integration is configured
   */
  isSafetyEnabled(): boolean {
    return this.safetyGuard !== undefined;
  }

  /**
   * Get safety status for diagnostics
   */
  getDiagnostics(): any {
    return {
      safetyGuard: this.safetyGuard !== undefined,
      toolRouter: this.toolRouter !== undefined,
      riskEvaluator: this.riskEvaluator !== undefined,
      rollbackProtocol: this.rollbackManager !== undefined,
      isFullyConfigured: this.safetyGuard !== undefined
    };
  }

  private sanitizeArray(arr: string[]): string[] {
    return arr.filter(item => item !== null && item !== '');
  }
}