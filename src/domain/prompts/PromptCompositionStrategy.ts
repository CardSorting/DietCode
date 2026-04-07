/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Interface contracts for prompt composition strategies
 */

import type { PromptDefinition } from './PromptCategory';
import type { TemplateContext } from './PromptTemplateEngine';

/**
 * Strategy interface for applying context-based enhancements
 * Example: Loads memory items into template context
 */
export interface ContextAwareStrategy {
  name: string;
  canApply(prompt: PromptDefinition, context: Partial<TemplateContext>): boolean;
  apply(
    prompt: PromptDefinition,
    context: Partial<TemplateContext>,
  ): Promise<{ context: Partial<TemplateContext>; notes: string[] }>;
}

/**
 * Strategy interface for applying pattern-based enhancements
 * Example: Wraps prompts with risk assessment instructions from patterns/
 */
export interface PatternAwareStrategy {
  name: string;
  canApply(prompt: PromptDefinition, context: Partial<TemplateContext>): boolean;
  apply(
    prompt: PromptDefinition,
    context: Partial<TemplateContext>,
  ): Promise<{ prompt: string; notes: string[] }>;
}

/**
 * Strategy interface for wrapping with verification steps
 * Example: Appends verification prompts from patterns/06-verification.md
 */
export interface VerificationAwareStrategy {
  name: string;
  canApply(prompt: PromptDefinition, riskTier: string): boolean;
  apply(prompt: PromptDefinition, riskTier: string): Promise<{ wrapper: string; append: boolean }>;
}

/**
 * Strategy interface for wrapping with skill-based instructions
 * Example: Includes skill-specific guidance from skills/
 */
export interface SkillAwareStrategy {
  name: string;
  canApply(prompt: PromptDefinition, skills?: string[]): boolean;
  apply(
    prompt: PromptDefinition,
    skills?: string[],
  ): Promise<{ wrapper: string; prepend?: string }>;
}

/**
 * Composite strategy that applies multiple strategies in sequence
 */
export interface CompositeCompositionStrategy {
  strategies: (
    | ContextAwareStrategy
    | PatternAwareStrategy
    | VerificationAwareStrategy
    | SkillAwareStrategy
  )[];

  compose(
    prompt: PromptDefinition,
    context: Partial<TemplateContext>,
  ): Promise<{
    finalPrompt: string;
    appliedStrategies: string[];
    allNotes: string[];
  }>;
}
