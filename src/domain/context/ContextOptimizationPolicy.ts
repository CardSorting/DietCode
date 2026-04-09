/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [DOMAIN: CONTEXT_OPTIMIZATION_POLICY]
 * Principle: Pure business logic defining optimization rules and thresholds
 * Violations: None
 */

import type {
  FileOptimizationDecision,
  FileReadResult,
  OptimizationSessionStats,
  ReadEntry,
} from './FileMetadata';
import { aggregateReadMetadata, determineOptimizationDecision } from './FileMetadata';

/**
 * Configuration parameters for context optimization
 */
export interface OptimizationConfig {
  // Maximum number of file reads before forcing optimization window
  maxFileReadsPerSession: number;

  // Time window in milliseconds to consider reads as duplicates
  duplicateWindowMs: number;

  // Minimum savings percentage to keep file content (otherwise truncate)
  // If below 30%, truncate; if above, keep
  savingsThreshold: number;

  // Enable two-finger pattern (replace duplicates with notices)
  enableTwoFinger: boolean;

  // Enable ROS for variant selection
  enableRos: boolean;

  // Maximum context size before forced truncation (tokens or bytes)
  maxContextSize: number;

  // Trigger optimization at this percentage of context size
  optimizationTrigger: number;

  // Enable on-the-fly optimization (apply to current read)
  enableOnTheFly: boolean;
}

/**
 * Default optimization configuration
 * Balanced for most workflows
 */
export const defaultOptimizationConfig: OptimizationConfig = {
  maxFileReadsPerSession: 10,
  duplicateWindowMs: 30000, // 30 seconds
  savingsThreshold: 30, // 30% saving threshold
  enableTwoFinger: true,
  enableRos: false, // Disabled by default until infrastructure is ready
  maxContextSize: 512 * 1024, // 512KB
  optimizationTrigger: 80, // Optimize at 80% of max
  enableOnTheFly: false,
};

/**
 * Apply two-finger pattern optimization
 * Replaces subsequent reads with a notice placeholder
 */
export function applyTwoFingerPattern(
  filePath: string,
  noticeText = 'Duplicate file read notice',
): FileReadResult {
  return {
    filePath,
    content: noticeText,
    timestamp: Date.now(),
    source: 'context_optimization',
    originalLength: filePath.length + noticeText.length,
    optimizedLength: noticeText.length,
    wasOptimized: true,
    optimizationReason: 'two_finger_pattern',
    hash: `notice-${Date.now()}`,
    sizeBytes: noticeText.length,
  };
}

/**
 * Check if optimization window should be triggered
 */
export function shouldTriggerOptimizationWindow(
  checkpoints: ReadonlyArray<FileReadResult>,
  previousOptimization: OptimizationSessionStats | null,
): boolean {
  if (!previousOptimization) {
    return false;
  }

  const readCount = previousOptimization.totalReads;
  const contextSizeBytes = previousOptimization.totalOriginalBytes;

  // Trigger if max reads exceeded
  const readsExceeded = readCount >= 10;

  // Trigger if context size threshold exceeded
  const contextExceeded = contextSizeBytes > 512 * 1024; // 512KB

  return readsExceeded || contextExceeded;
}

/**
 * Analyze a batch of file reads and determine optimizations
 */
export function analyzeAndApplyOptimizations(
  entries: ReadonlyArray<ReadEntry>,
  config: OptimizationConfig,
): {
  originalEntries: ReadonlyArray<ReadEntry>;
  optimizedEntries: ReadonlyArray<FileReadResult>;
  stats: OptimizationSessionStats;
  decisions: ReadonlyArray<FileOptimizationDecision>;
} {
  const appliedDecisions: FileOptimizationDecision[] = [];
  const optimizedEntries: FileReadResult[] = [];

  for (const entry of entries) {
    // Aggregate metadata for all entries to get duplicate patterns
    const { duplicateMetadata } = aggregateReadMetadata([...entries]);

    // Get metadata for this specific file
    const fileMetadata = duplicateMetadata.get(entry.filePath);

    // Determine optimization decision
    const decision = determineOptimizationDecision(
      entry,
      fileMetadata || {
        filePath: entry.filePath,
        firstReadTimestamp: entry.timestamp,
        subsequentReadTimestamps: [],
        firstReadContentHash: entry.contentHash,
        duplicateCount: 1,
        isDuplicate: false,
      },
      config.duplicateWindowMs,
      config.savingsThreshold,
    );

    appliedDecisions.push(decision);

    // Apply two-finger pattern if enabled and within window
    if (config.enableTwoFinger && decision.applyTwoFingerPattern) {
      optimizedEntries.push(applyTwoFingerPattern(entry.filePath));
    } else {
      // Keep original
      optimizedEntries.push({
        ...entry,
        optimizedLength: entry.originalLength,
        wasOptimized: false,
        hash: entry.contentHash,
        sizeBytes: entry.originalLength,
      });
    }
  }

  return {
    originalEntries: entries,
    optimizedEntries,
    stats: aggregateReadMetadata(entries).stats,
    decisions: appliedDecisions,
  };
}

/**
 * Calculate savings percentage for context
 */
export function calculateContextSavings(
  originalStats: OptimizationSessionStats,
  optimizedStats: OptimizationSessionStats,
): number {
  if (originalStats.totalOriginalBytes === 0) return 0;
  const bytesSaved = originalStats.totalOriginalBytes - optimizedStats.totalOptimizedBytes;
  return (bytesSaved / originalStats.totalOriginalBytes) * 100;
}

/**
 * Validate if a configuration is valid
 */
export function validateConfig(config: OptimizationConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.maxFileReadsPerSession <= 0) {
    errors.push('maxFileReadsPerSession must be positive');
  }

  if (config.duplicateWindowMs <= 0) {
    errors.push('duplicateWindowMs must be positive');
  }

  if (config.savingsThreshold < 0 || config.savingsThreshold > 100) {
    errors.push('savingsThreshold must be between 0 and 100');
  }

  if (config.maxContextSize <= 0) {
    errors.push('maxContextSize must be positive');
  }

  if (config.optimizationTrigger < 0 || config.optimizationTrigger > 100) {
    errors.push('optimizationTrigger must be between 0 and 100');
  }

  if (!config.enableOnTheFly) {
    errors.push('enableOnTheFly should be enhanced for based-on-full-context optimization');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get optimization recommendations for a session
 */
export function getOptimizationRecommendations(
  stats: OptimizationSessionStats,
  config: OptimizationConfig,
): string[] {
  const recommendations: string[] = [];

  if (stats.duplicatesProcessed > 1 && stats.percentageSaved > config.savingsThreshold) {
    recommendations.push(
      `Two-finger pattern successfully saved ${stats.percentageSaved.toFixed(1)}% context space`,
    );
  }

  if (stats.duplicatesProcessed > 5) {
    recommendations.push(
      `High duplication detected (${stats.duplicatesProcessed} duplicates) - consider refactoring`,
    );
  }

  if (stats.percentageSaved < config.savingsThreshold) {
    recommendations.push(
      `Optimization savings below threshold (${config.savingsThreshold}%) - consider reducing read frequency`,
    );
  }

  if (stats.totalReads >= config.maxFileReadsPerSession) {
    recommendations.push(`Read session max limit reached (${config.maxFileReadsPerSession} reads)`);
  }

  return recommendations;
}

/**
 * Check if context should be truncated based on threshold
 */
export function shouldTruncateContext(
  stats: OptimizationSessionStats,
  config: OptimizationConfig,
): boolean {
  const percentageSaved = stats.percentageSaved;
  const contextRatio = stats.totalOriginalBytes / config.maxContextSize;

  // Truncate if: savings below threshold OR context size exceeded
  const savingsTooLow = stats.duplicatesProcessed > 0 && percentageSaved < config.savingsThreshold;
  const contextTooLarge = contextRatio > config.optimizationTrigger / 100;

  return savingsTooLow || contextTooLarge;
}
