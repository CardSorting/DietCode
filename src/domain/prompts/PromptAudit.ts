/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic for tracking prompt conflicts and lineage.
 */

import type { PromptCategory, PromptDefinition } from './PromptCategory';
import { PromptSource, type PromptSource as PromptSourceEnum } from './PromptIndex';

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
  metadata: Record<string, any> | undefined;
}

export enum ConflictType {
  DUPLICATE_ID = 'DUPLICATE_ID',
  OVERRIDDEN_PREAMBLE = 'OVERRIDDEN_PREAMBLE',
  CLASHING_METADATA_KEY = 'CLASHING_METADATA_KEY',
  PRIORITY_VIOLATION = 'PRIORITY_VIOLATION',
  CATEGORY_MISMATCH = 'CATEGORY_MISMATCH',
}

export enum ConflictResolutionStrategy {
  OVERRIDE = 'OVERRIDE',
  MERGE = 'MERGE',
  KEEP_EXISTING = 'KEEP_EXISTING',
  annotate_slow = 'ANNOTATE_SLOW',
  PRUNE = 'PRUNE',
  RESOLVE_TO_DEFAULT = 'RESOLVE_TO_DEFAULT',
}

export interface PromptComplianceRecord {
  valid: boolean;
  violations: string[];
  category: PromptCategory;
  hasInteractiveElements: boolean;
  exceedsSizeLimit: boolean;
}

export class ConflictResolver {
  private constructor() {}
  /**
   * Determines the appropriate resolution strategy for a conflict.
   */
  static resolve(
    existing: PromptDefinition,
    incoming: PromptDefinition,
    incomingPriority: number,
    incomingSource: PromptSourceEnum,
  ): ConflictResolutionStrategy {
    // Rule: Higher priority always wins (User > Project > Repository > Embedded)
    const existingPriority = existing.metadata?.priority ?? 0;
    if (incomingPriority > existingPriority) {
      return ConflictResolutionStrategy.OVERRIDE;
    }

    // Rule: If priorities are equal, use timestamp tiebreaker
    if (incomingPriority === existingPriority) {
      const incomingTime = incoming.metadata?.timestamp;
      const existingTime = existing.metadata?.timestamp;

      if (!incomingTime || !existingTime) return ConflictResolutionStrategy.KEEP_EXISTING;
      return new Date(incomingTime) > new Date(existingTime)
        ? ConflictResolutionStrategy.OVERRIDE
        : ConflictResolutionStrategy.KEEP_EXISTING;
    }

    // Rule: Scope restrictions take precedence
    if (existing.metadata?.scope === 'restricted' && incoming.metadata?.scope === 'public') {
      return ConflictResolutionStrategy.KEEP_EXISTING;
    }

    // Default: Keep existing prompt
    return ConflictResolutionStrategy.KEEP_EXISTING;
  }

  /**
   * Resolves type of conflict and returns the resolution strategy.
   */
  static analyze(
    existing: PromptDefinition,
    incoming: PromptDefinition,
    incomingPriority: number,
    incomingSource: PromptSourceEnum,
  ): ConflictType {
    // Type 1: Duplicate IDs - deeper probing required
    if (existing.id === incoming.id) {
      return ConflictType.DUPLICATE_ID;
    }

    // Type 2: Clashing metadata keys
    if (
      existing.metadata &&
      incoming.metadata &&
      !ConflictResolver.areMetadataCompatible(existing.metadata, incoming.metadata)
    ) {
      return ConflictType.CLASHING_METADATA_KEY;
    }

    // Type 3: Priority violations
    const existingPriority = existing.metadata?.priority ?? 0;
    if (existingPriority > incomingPriority) {
      return ConflictType.PRIORITY_VIOLATION;
    }

    // Type 4: Category mismatches
    if (existing.category !== incoming.category) {
      return ConflictType.CATEGORY_MISMATCH;
    }

    // Unknown conflict type
    return ConflictType.OVERRIDDEN_PREAMBLE;
  }

  private static areMetadataCompatible(
    existing: Record<string, any>,
    incoming: Record<string, any>,
  ): boolean {
    const keys: string[] = [...Object.keys(existing), ...Object.keys(incoming)];
    for (const key of keys) {
      if (!ConflictResolver.isSharedMetadataKey(key)) {
        return false;
      }
    }
    return true;
  }

  private static isSharedMetadataKey(key: string): boolean {
    return ['priority', 'timestamp', 'source', 'scope', 'labels', 'tags', 'version'].includes(key);
  }

  /**
   * Reviews conflict resolution history and provides summary statistics.
   */
  static reviewHistory(auditRecord: PromptAudit): ConflictSummary {
    const conflictCount = auditRecord.conflictHistory.length;
    const resolvedByStrategy = new Map<ConflictResolutionStrategy, number>();

    for (const conflict of auditRecord.conflictHistory) {
      const count = resolvedByStrategy.get(conflict.resolution) ?? 0;
      resolvedByStrategy.set(conflict.resolution, count + 1);
    }

    const lastConflict: ConflictResolution | undefined =
      conflictCount > 0
        ? (auditRecord.conflictHistory[conflictCount - 1] ?? auditRecord.conflictHistory[0])
        : undefined;

    return {
      conflictCount,
      totalStrategies: resolvedByStrategy.size,
      strategies: Object.fromEntries(resolvedByStrategy) as Record<
        ConflictResolutionStrategy,
        number
      >,
      complianceStatus: auditRecord.compliance,
      lastConflict: lastConflict || {
        id: '',
        timestamp: '',
        type: ConflictType.DUPLICATE_ID,
        resolution: ConflictResolutionStrategy.KEEP_EXISTING,
        affectedPrompts: [],
        metadata: {},
      },
    };
  }

  /**
   * Consolidates similar conflict resolutions into groups for analysis
   */
  static consolidateSimilarConflicts(auditRecord: PromptAudit): GroupedConflictSummary {
    const groups = new Map<ConflictType, number>();

    for (const conflict of auditRecord.conflictHistory) {
      const count = groups.get(conflict.type) ?? 0;
      groups.set(conflict.type, count + 1);
    }

    const mostCommonEntry = [...groups.entries()].sort(
      (a, b) => (b[1] as number) - (a[1] as number),
    )[0];
    const mostCommonType = mostCommonEntry ? mostCommonEntry[0] : undefined;
    const mostCommonConflict = auditRecord.conflictHistory.find(
      (c) => c.type === mostCommonType,
    ) ?? {
      id: '',
      timestamp: '',
      type: ConflictType.DUPLICATE_ID,
      resolution: ConflictResolutionStrategy.KEEP_EXISTING,
      affectedPrompts: [],
      metadata: {},
    };

    return {
      mostCommonConflict,
      mostCommonType,
      count: groups.size,
    };
  }
}

export interface ConflictSummary {
  conflictCount: number;
  totalStrategies: number;
  strategies: Record<ConflictResolutionStrategy, number>;
  complianceStatus: PromptComplianceRecord;
  lastConflict: ConflictResolution;
}

export interface GroupedConflictSummary {
  mostCommonConflict: ConflictResolution;
  mostCommonType: string | undefined;
  count: number;
}
