/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [DOMAIN: PROMPT_TEMPLATE]
 * Principle: Pure business logic for templating system
 * Violations: None
 */

/**
 * Metadata for a template
 */
export interface PromptTemplateMetadata {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  version: string;
  author?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Template with placeholder support for dynamic prompt generation
 */
export interface PromptTemplate {
  name: string;
  description: string;
  version: string;
  tags: string[];
  systemPrompt: string;
  userPrompt: string;
  content: string;
  variables: string[];
  enabled: boolean;
  metadata?: Record<string, any>;
}

/**
 * Configuration for prompt template loading/rendering
 */
export interface PromptTemplateConfig {
  systemPrompt?: string;
  userPrompt?: string;
  variables?: Record<string, any>;
}

/**
 * Variables for prompt injection
 */
export type PromptVariables = Record<string, string | number | boolean | (() => string)>;

/**
 * Registry for managing template lifecycle
 */
export interface PromptTemplateManager {
  /**
   * Retrieve a template by ID
   */
  getTemplate(id: string): PromptTemplate | null;

  /**
   * List all templates with optional tag filtering
   */
  listTemplates(tag?: string): PromptTemplate[];

  /**
   * Save or update a template
   */
  saveTemplate(template: PromptTemplate): void;

  /**
   * Delete a template
   */
  deleteTemplate(id: string): void;

  /**
   * Format a template by replacing placeholders
   */
  format(id: string, values: Record<string, string>): string;
}
