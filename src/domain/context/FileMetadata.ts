/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [DOMAIN: FILE_METADATA]
 * Principle: Pure business logic for file metadata tracking
 * Violations: None
 */

import type {
  FileMetadata as FileMetadataInterface,
  FileReadResult,
  FileReadSource,
} from './FileOperation';
export type { FileReadSource, FileReadResult };

/**
 * Detailed metadata about duplicate file reads
 * Used by the two-finger optimization pattern
 */
export interface DuplicateReadMetadata {
  filePath: string;
  firstReadTimestamp: number;
  lastReadTimestamp?: number;
  subsequentReadTimestamps: number[];
  firstReadContentHash: string;
  duplicateCount: number;
  isDuplicate: boolean;
}

/**
 * File read entry in the optimization buffer
 */
export interface ReadEntry {
  filePath: string;
  content: string;
  timestamp: number;
  contentHash: string;
  source: FileReadSource;
  originalLength: number;
}

/**
 * Optimization decision for a specific file
 */
export interface FileOptimizationDecision {
  filePath: string;
  keepOriginal: boolean;
  applyTwoFingerPattern: boolean;
  duplicateWindowMs: number;
  savingsThreshold: number;
  calculatedSavings: number;
  reason: string;
}

/**
 * Statistics for optimization session
 */
export interface OptimizationSessionStats {
  totalReads: number;
  duplicateReads: number;
  totalOriginalBytes: number;
  totalOptimizedBytes: number;
  bytesSaved: number;
  percentageSaved: number;
  applicableFiles: string[];
  duplicatesProcessed: number;
  sessionStartTime: number;
  sessionEndTime?: number;
}

/**
 * Helper to check if a read should be considered a duplicate
 * within the specified time window
 */
export function isReadDuplicate(
  recentReads: ReadonlyArray<ReadEntry>,
  currentEntry: ReadEntry,
  windowMs: number,
): boolean {
  const mostRecentTimestamp =
    recentReads.length > 0 ? recentReads[recentReads.length - 1]?.timestamp || 0 : 0;

  // Check if current read is within the duplicate window of most recent read
  const timeDelta = currentEntry.timestamp - mostRecentTimestamp;

  if (timeDelta > windowMs) {
    return false;
  }

  // Check if content hash matches (exact duplicate)
  const hashMatch = recentReads.some(
    (read) =>
      read &&
      read.filePath === currentEntry.filePath &&
      read.contentHash === currentEntry.contentHash,
  );

  return hashMatch;
}

/**
 * Calculate savings percentage
 */
export function calculateSavingsPercentage(
  originalLength: number,
  optimizedLength: number,
): number {
  if (originalLength === 0) return 0;
  const bytesSaved = originalLength - optimizedLength;
  return (bytesSaved / originalLength) * 100;
}

/**
 * Determine optimization decision based on two-finger pattern
 */
export function determineOptimizationDecision(
  entry: ReadEntry,
  duplicateMetadata: DuplicateReadMetadata,
  duplicateWindowMs: number,
  savingsThreshold: number,
): FileOptimizationDecision {
  // If first read, keep original
  if (duplicateMetadata.duplicateCount === 0) {
    return {
      filePath: entry.filePath,
      keepOriginal: true,
      applyTwoFingerPattern: false,
      duplicateWindowMs,
      savingsThreshold,
      calculatedSavings: 0,
      reason: 'first_read',
    };
  }

  // Check if we should apply two-finger pattern (replace with notice)
  const bytesSaved = duplicateMetadata.isDuplicate
    ? calculateSavingsPercentage(entry.originalLength, 'Duplicate file read notice'.length)
    : 0;

  // Apply two-finger if: not first read AND savings exceed threshold
  return {
    filePath: entry.filePath,
    keepOriginal: false,
    applyTwoFingerPattern: true,
    duplicateWindowMs,
    savingsThreshold,
    calculatedSavings: bytesSaved,
    reason:
      bytesSaved > savingsThreshold
        ? `significant_savings (${bytesSaved.toFixed(1)}%)`
        : `threshold_met_for_${duplicateWindowMs}ms_window`,
  };
}

/**
 * Aggregate read entries into metadata
 */
export function aggregateReadMetadata(entries: ReadonlyArray<ReadEntry>): {
  duplicateMetadata: Map<string, DuplicateReadMetadata>;
  stats: OptimizationSessionStats;
} {
  const duplicateReadsByFile = new Map<string, DuplicateReadMetadata>();
  let totalOriginalBytes = 0;
  let totalReadCount = 0;

  for (const entry of entries) {
    totalOriginalBytes += entry.originalLength;
    totalReadCount++;

    let metadata = duplicateReadsByFile.get(entry.filePath);
    const currentTimestamp = Date.now();
    const timeSinceFirstRead = currentTimestamp - (metadata?.firstReadTimestamp || 0);
    if (!metadata) {
      metadata = {
        filePath: entry.filePath,
        firstReadTimestamp: currentTimestamp,
        subsequentReadTimestamps: [],
        firstReadContentHash: entry.contentHash,
        duplicateCount: 1,
        isDuplicate: false,
      };
    } else {
      metadata.duplicateCount++;
      metadata.subsequentReadTimestamps.push(currentTimestamp);

      // Check if still within duplicate window
      metadata.isDuplicate = timeSinceFirstRead <= 30000; // 30 seconds default window
    }

    duplicateReadsByFile.set(entry.filePath, metadata);
  }

  const applicableFiles = Array.from(duplicateReadsByFile.values())
    .filter((m) => m.duplicateCount > 1)
    .map((m) => m.filePath);

  const totalSavings = applicableFiles.reduce((sum, filePath) => {
    const metadata = duplicateReadsByFile.get(filePath);
    if (!metadata) return sum;
    const savings = calculateSavingsPercentage(
      metadata.firstReadContentHash.length,
      'Duplicate file read notice'.length,
    );
    return sum + savings;
  }, 0);

  const bytesSaved = entries.reduce((sum, entry) => {
    if (entry.content === 'Duplicate file read notice') {
      return sum + (entry.originalLength - 43); // length of notice
    }
    return sum;
  }, 0);

  return {
    duplicateMetadata: duplicateReadsByFile,
    stats: {
      totalReads: totalReadCount,
      duplicateReads: applicableFiles.length,
      totalOriginalBytes,
      totalOptimizedBytes: entries.reduce(
        (sum, e) =>
          sum + ((e as any).wasOptimized ? (e as any).optimizedLength || 0 : e.originalLength),
        0,
      ),
      bytesSaved,
      percentageSaved: totalOriginalBytes > 0 ? (bytesSaved / totalOriginalBytes) * 100 : 0,
      applicableFiles,
      duplicatesProcessed: applicableFiles.length,
      sessionStartTime: entries.length > 0 ? (entries[0] as ReadEntry).timestamp : Date.now(),
    },
  };
}
