/**
 * [LAYER: CORE]
 * Principle: Orchestrate execution hooks with pre-tool cancellation
 * Prework Status: Not applicable (new file)
 * 
 * Manages multi-phase hook chains with pre-tool-use cancellation capability.
 * Ensures hook pipeline integrity with smart failure isolation.
 */

import { HookPhase } from '../../domain/hooks/HookContract';
import type {
  Hook,
  PreToolCancellationProtocol,
} from '../../domain/hooks/HookContract';

/**
 * Hook execution result
 */
export interface HookExecutionResult {
  /**
   * True if the hook succeeded
   */
  success: boolean;

  /**
   * Hook that executed
   */
  hook: Hook;

  /**
   * Exception if hook failed
   */
  error?: Error;

  /**
   * Return value from hook execute
   */
  returnValue?: any;
}

/**
 * Pre-tool cancellation error
 */
export class PreToolCancellationError extends Error {
  public readonly toolName: string;
  public readonly protocol: PreToolCancellationProtocol;

  constructor(
    toolName: string,
    protocol: PreToolCancellationProtocol
  ) {
    super(`Pre-tool-use cancellation triggered for "${toolName}": ${protocol.reason}`);
    this.name = 'PreToolCancellationError';
    this.toolName = toolName;
    this.protocol = protocol;
  }
}

/**
 * HookOrchestrator
 * 
 * Orchestrates multi-stage execution hooks with pre-tool-use cancellation.
 * Key features:
 * - Pre-tool cancellation (veto before execution)
 * - Parallel execution with failure handling
 * - Phase-based execution (PRE_TOOL_USE → TOOL_EXECUTION → POST_EXECUTION)
 * - Priority-based ordering
 * - Hook isolation (failure in one hook doesn't disable others)
 * 
 * Usage pattern:
 * 1. Register hooks by phase
 * 2. Call chain() to execute
 * 3. Hooks can veto in PRE_TOOL_USE (immediate cancellation)
 * 4. Hook errors are caught but don't halt entire pipeline
 */
export class HookOrchestrator {
  private static instance: HookOrchestrator | null = null;
  private hooks = new Map<HookPhase, Hook[]>();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): HookOrchestrator {
    if (!HookOrchestrator.instance) {
      HookOrchestrator.instance = new HookOrchestrator();
    }
    return HookOrchestrator.instance;
  }

  /**
   * Register a hook for a specific phase
   * 
   * @param hook - The hook to register
   */
  registerHook(hook: Hook): void {
    if (!this.hooks.has(hook.phase)) {
      this.hooks.set(hook.phase, []);
    }

    this.hooks.get(hook.phase)!.push(hook);

    // Sort by priority (descending)
    this.hooks.set(hook.phase, hookSortByPriority(
      this.hooks.get(hook.phase)!
    ));

    console.log(`✅ Hook registered: ${hook.name} (${hook.phase}, priority: ${hook.priority})`);
  }

  /**
   * Execute a hook chain
   * 
   * @param toolName - Name of the tool being processed
   * @param input - Input data for the hook chain
   * @param toolResult - Result of the tool execution (for POST_EXECUTION hooks)
   * @returns Final result after all hooks in chain
   * @throws PreToolCancellationError if pre-tool hooks cancel
   */
  async chain<T>(toolName: string, input: T, toolResult?: any): Promise<any> {
    // Phase 1: PRE_TOOL_USE hooks (for cancellation)
    const preHooks = this.hooks.get(HookPhase.PRE_TOOL_USE) || [];

    if (preHooks.length > 0) {
      console.log(`🚀 Executing PRE_TOOL_USE hooks for "${toolName}"...`);
    }

    for (const hook of preHooks) {
      try {
        const result = await hook.execute({ toolName, input });
        
        // Check for cancellation protocol
        if (result && result.shouldCancel) {
          console.warn(`⚠️  Pre-tool hook "${hook.name}" triggered cancellation: ${result.reason}`);
          
          // Fail fast - don't execute tool
          throw new PreToolCancellationError(toolName, result);
        }
      } catch (error: any) {
        if (error instanceof PreToolCancellationError) throw error;
        // Catch other errors but continue (isolation)
        console.error(`❌ Pre-tool hook "${hook.name}" failed:`, error);
      }
    }

    // Phase 2: TOOL_EXECUTION
    const toolHooks = this.hooks.get(HookPhase.TOOL_EXECUTION) || [];
    let currentInput = input;

    if (toolHooks.length > 0) {
      console.log(`⚙️  Executing TOOL_EXECUTION hooks for "${toolName}"...`);
    }

    for (const hook of toolHooks) {
      try {
        currentInput = await hook.execute({ toolName, input: currentInput });
      } catch (error: any) {
        console.error(`❌ Tool execution hook "${hook.name}" failed:`, error);
        // Continue to next hook (isolation)
      }
    }

    // Phase 3: POST_EXECUTION
    const postHooks = this.hooks.get(HookPhase.POST_EXECUTION) || [];
    let currentResult = toolResult;

    if (postHooks.length > 0) {
      console.log(`✅ Executing POST_EXECUTION hooks for "${toolName}"...`);
    }

    for (const hook of postHooks) {
      try {
        currentResult = await hook.execute({ toolName, input, result: currentResult });
      } catch (error: any) {
        console.error(`❌ Post-execution hook "${hook.name}" failed:`, error);
        // Continue to next hook (isolation)
      }
    }

    return currentResult || currentInput;
  }

  /**
   * Get registered hooks by phase
   */
  getHooks(phase: HookPhase): Hook[] {
    return this.hooks.get(phase) || [];
  }

  /**
   * Remove all hooks from a phase
   */
  clearPhase(phase: HookPhase): void {
    this.hooks.delete(phase);
    console.log(`🗑️  Cleared ${phase} hooks`);
  }

  /**
   * Clear all hooks
   */
  clearAll(): void {
    this.hooks.clear();
    console.log('🗑️  Cleared all hooks');
  }

  /**
   * Get hook count
   */
  getHookCount(phase?: HookPhase): number {
    if (phase) {
      return (this.hooks.get(phase) || []).length;
    }
    return Array.from(this.hooks.values()).reduce((sum, hooks) => sum + hooks.length, 0);
  }
}

/**
 * Sort hooks by priority (descending)
 */
function hookSortByPriority(hooks: Hook[]): Hook[] {
  return [...hooks].sort((a, b) => b.priority - a.priority);
}

/**
 * Create a lazy hook orchestration system
 */
export function createLazyHookOrchestrator(onInit: () => void): Omit<HookOrchestrator, 'getInstance'> {
  // Replace getInstance with lazy initialization
  const state = {
    instance: null as HookOrchestrator | null,
  };

  const getInstance = () => {
    if (!state.instance) {
      state.instance = HookOrchestrator.getInstance();
      onInit();
    }
    return state.instance;
  };

  return {
    registerHook: (hook: Hook) => {
      return getInstance().registerHook(hook);
    },
    chain: async <T>(toolName: string, input: T) => {
      return getInstance().chain<T>(toolName, input);
    },
    getHooks: (phase: HookPhase) => {
      return getInstance().getHooks(phase);
    },
    clearPhase: (phase: HookPhase) => {
      return getInstance().clearPhase(phase);
    },
    clearAll: () => {
      return getInstance().clearAll();
    },
    getHookCount: (phase?: HookPhase) => {
      return getInstance().getHookCount(phase);
    }
  };
}