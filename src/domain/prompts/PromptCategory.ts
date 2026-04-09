/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic and types for prompt taxonomy.
 */

export enum PromptCategory {
  SYSTEM_CORE = 'SYSTEM_CORE',
  AGENT_ORCHESTRATION = 'AGENT_ORCHESTRATION',
  TOOL_PROTOCOLS = 'TOOL_PROTOCOLS',
  MEMORY_CYCLES = 'MEMORY_CYCLES',
  VERIFICATION_CHECKPOINTS = 'VERIFICATION_CHECKPOINTS',
  UTILITY_OPERATIONS = 'UTILITY_OPERATIONS',
  SECURITY_PATTERNS = 'SECURITY_PATTERNS',
}

export interface PromptDefinition {
  id: string;
  category: PromptCategory;
  name: string;
  description: string;
  content: string;
  dangerLevel?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
  path?: string;
}

export interface PromptCollection {
  id: string;
  category: PromptCategory;
  name: string;
  version: string;
  publisher: string;
  licensing: string;
  subcollections: string[];
  promptDefinitions: PromptDefinition[];
}

export enum MaintenanceTier {
  PREMIUM = 'PREMIUM',
  STANDARD = 'STANDARD',
  CUSTOM = 'CUSTOM',
}
