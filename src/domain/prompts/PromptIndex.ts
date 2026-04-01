/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic for managing loaded prompt collections.
 */

import { PromptCategory, PromptDefinition, MaintenanceTier } from './PromptCategory';
import type { Event } from '../Event';
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

export interface PromptSource {
  origin: PromptSource;
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