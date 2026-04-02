/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic for managing loaded prompt collections.
 */

import type { PromptCategory } from './PromptCategory';
import type { PromptDefinition } from './PromptCategory';
import type { PromptCollection } from './PromptCategory';
import type { SystemEvent } from '../events/SystemEvent';
import type { PromptAudit } from './PromptAudit';

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
  TEMPORARY_CACHE = 'TEMPORARY_CACHE'
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