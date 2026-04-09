/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic for managing loaded prompt collections.
 */

import type { SystemEvent } from '../events/SystemEvent';
import type { PromptAudit } from './PromptAudit';
import type { PromptCategory } from './PromptCategory';
import type { PromptDefinition } from './PromptCategory';
import type { PromptCollection } from './PromptCategory';

export interface PromptIndex {
  version: string;
  lastUpdated: string;
  rootSources: PromptSource[];
  collections: PromptCollection[];
  auditTrail: PromptAudit[];
}

export enum PromptSource {
  REPOSITORY_BASE = 'REPOSITORY_BASE',
  LOCAL_OVERRIDE = 'LOCAL_OVERRIDE',
  USER_DEFINED = 'USER_DEFINED',
  SKILL_FILE = 'SKILL_FILE',
  TEMPORARY_CACHE = 'TEMPORARY_CACHE',
}

// Export enum as type alias to avoid circular dependency
export type PromptSourceEnum = PromptSource;

// Renamed to avoid conflict with PromptSource enum
export interface PromptSourceConfig {
  origin: PromptSourceEnum;
  path: string;
  priority: number;
  loadedAt: string;
}

export interface PromptMetadata {
  parentId?: string;
  expectedFlow?: 'pre_execution' | 'post_execution' | 'during_execution';
  recommendedMemoryDepth?: number;
  requiresVerification?: boolean;
  dangerLevel?: 'low' | 'medium' | 'high' | 'critical';
  dietcodeFeature?:
    | 'MEMORY_CHECKPOINT'
    | 'VERIFICATION_TRIGGER'
    | 'CONTEXT_PROTOCOL'
    | 'AGENT_COMPOSITE'
    | 'RIPPLE_EFFECT';
}
