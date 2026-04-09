/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { HookPhase } from '../../domain/hooks/HookContract';
import type { Hook, PreToolCancellationProtocol } from '../../domain/hooks/HookContract';

/**
 * Custom error for pre-tool usage cancellation
 */
export class PreToolCancellationError extends Error {
  constructor(
    public toolName: string,
    public protocol: PreToolCancellationProtocol,
  ) {
    super(
      `Pre-tool hook cancelled execution of "${toolName}": ${protocol.reason || 'No reason provided'}`,
    );
    this.name = 'PreToolCancellationError';
  }
}

/**
 * [LAYER: CORE]
 * Principle: Orchestration — coordinates the execution of hooks across phases.
 */
export class HookOrchestrator {
  private hooks: Map<HookPhase, Hook[]> = new Map();

  /**
   * Register a new hook
   */
  register(hook: Hook): void {
    const list = this.hooks.get(hook.phase) || [];
    list.push(hook);
    // Sort by priority (descending)
    list.sort((a, b) => b.priority - a.priority);
    this.hooks.set(hook.phase, list);
    console.log(`🧲 Registered hook: ${hook.name} (${hook.phase})`);
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
        if (result?.shouldCancel) {
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
        if (hook.isBackground) {
          hook.execute({ toolName, input: currentInput }).catch((err) => {
            console.error(`❌ Background TOOL_EXECUTION hook "${hook.name}" failed:`, err);
          });
        } else {
          currentInput = await hook.execute({ toolName, input: currentInput });
        }
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
        if (hook.isBackground) {
          hook.execute({ toolName, input, result: currentResult }).catch((err) => {
            console.error(`❌ Background POST_EXECUTION hook "${hook.name}" failed:`, err);
          });
        } else {
          currentResult = await hook.execute({ toolName, input, result: currentResult });
        }
      } catch (error: any) {
        console.error(`❌ Post-execution hook "${hook.name}" failed:`, error);
        // Continue to next hook (isolation)
      }
    }

    return currentResult || currentInput;
  }

  /**
   * Get all registered hooks for debugging
   */
  getDiagnostics(): any {
    const diagnostics: any = {};
    for (const [phase, list] of this.hooks) {
      diagnostics[phase] = list.map((h) => h.name);
    }
    return diagnostics;
  }
}
