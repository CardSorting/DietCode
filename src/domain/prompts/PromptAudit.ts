/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic for tracking prompt conflicts and lineage.
 */

import { PromptSource, PromptSource as PromptSourceEnum } from './PromptIndex';
import { PromptCategory } from './PromptCategory';

export interface PromptAudit {
  promptId: string;
  source: PromptSourceEnum;
  loadChain: PromptLoadStep[];
  conflictHistory: ConflictResolution[];
  integrityHash: string;
  compliance: PromptComplianceRecord;
}

export interface PromptLoadStep {
  stepNumber: number;
  sourcePath: string;
  action: 'NEW_PROMPT' | 'OVERRIDE' | 'MERGE' | 'PRUNE';
  timestamp: string;
}

export interface ConflictResolution {
  id: string;
  timestamp: string;
  type: ConflictType;
  resolution: ConflictResolutionStrategy;
  affectedPrompts: string[];
  metadata: Record<string, any>;
}

export enum ConflictType {
  DUPLICATE_ID = 'DUPLICATE_ID',
  OVERRIDDEN_PREAMBLE = 'OVERRIDDEN_PREAMBLE',
  CLASHING_METADATA_KEY = 'CLASHING_METADATA_KEY',
  PRIORITY_VIOLATION = 'PRIORITY_VIOLATION',
  CATEGORY_MISMATCH = 'CATEGORY_MISMATCH'
}

export enum ConflictResolutionStrategy {
  OVERRIDE = 'OVERRIDE',
  MERGE = 'MERGE',
  KEEP_EXISTING = 'KEEP_EXISTING',
  annotate_slow = 'ANNOTATE_SLOW',
  PRUNE = 'PRUNE',
  RESOLVE_TO_DEFAULT = 'RESOLVE_TO_DEFAULT'
}

export interface PromptComplianceRecord {
  valid: boolean;
  violations: string[];
  category: PromptCategory;
  hasInteractiveElements: boolean;
  exceedsSizeLimit: boolean;
}

export class ConflictResolver {
  /**
   * Determines the appropriate resolution strategy for a conflict.
   */
  static resolve(
    existing: PromptDefinition,
    incoming: PromptDefinition,
    incomingPriority: number,
    incomingSource: PromptSourceEnum
  ): ConflictResolutionStrategy {
    // Rule: Higher priority always wins (User > Project > Repository > Embedded)
    if (incomingPriority > existing.metadata.priority) {
      return ConflictResolutionStrategy.OVERRIDE;
    }

    // Rule: If priorities are equal, use timestamp tiebreaker
    const existingPriority = existing.metadata.priority;
    if (incomingPriority === existingPriority) {
      const incomingTime = incoming.metadata.timestamp;
      const existingTime = existing.metadata.timestamp;
      
      if (!incomingTime || !existingTime) return ConflictResolutionStrategy.KEEP_EXISTING;
      return new Date(incomingTime) > new Date(existingTime) 
        ? ConflictResolutionStrategy.OVERRIDE 
        : ConflictResolutionStrategy.KEEP_EXISTING;
    }

    // Rule: Scope restrictions take precedence
    if (
      existing.metadata.scope === 'restricted' && 
      incoming.metadata.scope === 'public'
    ) {
      return ConflictResolutionStrategy.KEEP_EXISTING;
    }

    // Default: Keep existing prompt
    return ConflictResolutionStrategy.KEEP_EXISTING;
  }
}