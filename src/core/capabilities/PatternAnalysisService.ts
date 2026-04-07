/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { FileReuseDecision, PatternSessionStats } from '../../domain/context/FileReadPattern';
import { FileReuseStrategy } from '../../domain/context/FileReadPattern';
import { FileContextTracker } from '../context/FileContextTracker';

/**
 * Configuration for pattern analysis optimization
 */
export interface PatternAnalysisConfig {
  maxReuseCandidates: number; // Max files to consider for reuse
  minReuseConfidence: number; // Minimum confidence threshold
  maxContextReusePerSession: number; // Max reuse count before rotation
  trackTimestampWindowMs: number; // Time window for recent pattern matching
}

/**
 * Default configuration for pattern analysis
 */
export const DEFAULT_PATTERN_CONFIG: PatternAnalysisConfig = {
  maxReuseCandidates: 15,
  minReuseConfidence: 0.7,
  maxContextReusePerSession: 3,
  trackTimestampWindowMs: 600000, // 10 minutes
};

/**
 * Determines which file contexts should be reused based on analysis
 */
export class PatternAnalysisService {
  private tracker = FileContextTracker.getInstance();

  constructor(private config: PatternAnalysisConfig = DEFAULT_PATTERN_CONFIG) {}

  /**
   * Analyze file availability and determine reuse decisions
   */
  analyzePatternAvailability(
    filePaths: string[],
    timestampWindowMs: number = this.config.trackTimestampWindowMs,
  ): FileReuseDecision[] {
    const decisions: FileReuseDecision[] = [];

    for (const filePath of filePaths) {
      const metadata = this.tracker.getMetadata(filePath);
      let decision: FileReuseDecision;

      if (!metadata) {
        // File not tracked - need to load
        decision = {
          filePath,
          strategy: FileReuseStrategy.NO_REUSE,
          shouldReuse: false,
          confidence: 0.2,
          reason: 'low_confidence',
          timestamp: Date.now(),
        };
      } else {
        const isStale = this.tracker.isStale(filePath);
        const hasSignature = !!metadata.signature;

        if (!isStale && hasSignature) {
          // SEMANTIC PINNING: File is tracked, has a signature, and is NOT stale
          decision = {
            filePath,
            strategy: FileReuseStrategy.FULL_REUSE,
            shouldReuse: true,
            confidence: 1.0,
            reason: 'semantic_match',
            timestamp: Date.now(),
          };
        } else if (isStale) {
          // File is stale - MUST reload
          decision = {
            filePath,
            strategy: FileReuseStrategy.NO_REUSE,
            shouldReuse: false,
            confidence: 0.1,
            reason: 'checkpoint_stale',
            timestamp: Date.now(),
          };
        } else {
          // Tracked but no signature yet or other reason
          decision = {
            filePath,
            strategy: FileReuseStrategy.PARTIAL_REUSE,
            shouldReuse: false,
            confidence: 0.4,
            reason: 'metadata_only',
            timestamp: Date.now(),
          };
        }
      }

      decisions.push(decision);
    }

    return decisions;
  }

  /**
   * Apply session-level optimization: prioritize some files, discard others
   */
  optimizeSession(decisions: FileReuseDecision[], stats: PatternSessionStats): FileReuseDecision[] {
    // Sort by confidence (highest first)
    const sorted = [...decisions].sort((a, b) => b.confidence - a.confidence);

    // Select top candidates
    const candidates = sorted.slice(0, this.config.maxReuseCandidates);
    const totalReuseCount = stats.totalReuseCount;

    // Filter based on reuse limits and confidence threshold
    return candidates
      .filter((decision) => decision.confidence >= this.config.minReuseConfidence)
      .filter((_decision, index) =>
        totalReuseCount !== 0 ? index < this.config.maxContextReusePerSession : true,
      );
  }

  /**
   * Update statistics after session optimization
   */
  updateStatistics(
    decisions: FileReuseDecision[],
    stats: PatternSessionStats,
  ): PatternSessionStats {
    const currentReuseCount = decisions.filter((d) => d.shouldReuse).length;

    return {
      totalFiles: stats.totalFiles + decisions.length,
      reuseCandidates: stats.reuseCandidates + currentReuseCount,
      discardedCandidates: stats.discardedCandidates + (decisions.length - currentReuseCount),
      averageReuseConfidence:
        stats.reuseCandidates > 0
          ? (stats.averageReuseConfidence * stats.reuseCandidates +
              decisions.reduce((sum, d) => sum + d.confidence, 0)) /
            (stats.reuseCandidates + decisions.length)
          : decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length,
      totalReuseCount: stats.totalReuseCount + currentReuseCount,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate optimization report for human-readable insights
   */
  generateReport(decisions: FileReuseDecision[], stats: PatternSessionStats): string {
    const reuseCount = decisions.filter((d) => d.shouldReuse).length;
    const discardCount = decisions.filter((d) => !d.shouldReuse).length;

    return `
Pattern Analysis Report:
- Total Files: ${stats.totalFiles}
- Reuse Candidates: ${reuseCount}
- Discarded: ${discardCount}
- Avg Confidence: ${(stats.averageReuseConfidence * 100).toFixed(1)}%
- Reuse Limit: ${this.config.maxContextReusePerSession}
- Confidence Threshold: ${(this.config.minReuseConfidence * 100).toFixed(0)}%
    `.trim();
  }
}
