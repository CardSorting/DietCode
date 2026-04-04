/**
 * [DOMAIN: FILE_READ_PATTERN]
 * Principle: Pure business logic for identifying file read patterns
 * Violations: None
 */

import type { FileReadSource } from './FileOperation';

/**
 * Strategy for reusing file content during optimization
 */
export enum FileReuseStrategy {
  FULL_REUSE = 'full_reuse',
  PARTIAL_REUSE = 'partial_reuse',
  TRUNCATED_REUSE = 'truncated_reuse',
  NO_REUSE = 'no_reuse',
}

/**
 * Decision made by the pattern analyzer for a specific file read
 */
export interface FileReuseDecision {
  filePath: string;
  strategy: FileReuseStrategy;
  shouldReuse: boolean;
  confidence: number;
  reason: string;
  source?: FileReadSource;
  timestamp?: number;
}

/**
 * Statistics for pattern matching session performance
 */
export interface PatternSessionStats {
  totalFiles: number;
  reuseCandidates: number;
  discardedCandidates: number;
  averageReuseConfidence: number;
  totalReuseCount: number;
  timestamp?: number;
}
