/**
 * [CORE: PATTERN_ANALYSIS_SERVICE]
 * Principle: Orchestrates pattern matching and optimization decisions for file context
 * Violations: None
 */
import type { FileReuseDecision } from "../../domain/context/FileReadPattern";
import type { FileSignature } from "../../domain/context/FileSignatureService";
import type { PatternSessionStats } from "../../domain/context/FileReadPattern";

/**
 * Configuration for pattern analysis optimization
 */
export interface PatternAnalysisConfig {
  maxReuseCandidates: number;   // Max files to consider for reuse
  minReuseConfidence: number;   // Minimum confidence threshold
  maxContextReusePerSession: number; // Max reuse count before rotation
  trackTimestampWindowMs: number;     // Time window for recent pattern matching
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
  constructor(private config: PatternAnalysisConfig = DEFAULT_PATTERN_CONFIG) {}

  /**
   * Analyze file availability and determine reuse decisions
   */
  analyzePatternAvailability(
    filePaths: string[],
    signatures: Map<string, FileSignature>,
    timestampWindowMs: number = this.config.trackTimestampWindowMs
  ): FileReuseDecision[] {
    const decisions: FileReuseDecision[] = [];

    for (const filePath of filePaths) {
      const signature = signatures.get(filePath);
      let decision: FileReuseDecision;

      if (!signature) {
        // File not tracked - need to load
        decision = {
          filePath,
          shouldReuse: false,
          confidence: 0.2,
          reason: "low_confidence",
        };
      } else {
        // File tracked - evaluate based on freshness
        const fileAge = Date.now() - signature.timestamp;
        const isNewInWindow = fileAge <= timestampWindowMs;

        if (isNewInWindow) {
          decision = {
            filePath,
            shouldReuse: true,
            confidence: 1.0,
            reason: "pattern_match",
          };
        } else {
          // File outside time window - check if content changed
          const hasChanged = signature.isOutdated(signature.sizeBytes);
          decision = {
            filePath,
            shouldReuse: false,
            confidence: 0.3,
            reason: hasChanged ? "checkpoint_stale" : "recently_reused",
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
      .filter(
        (decision, index) => totalReuseCount !== 0 ? index < this.config.maxContextReusePerSession : true
      );
  }

  /**
   * Update statistics after session optimization
   */
  updateStatistics(
    decisions: FileReuseDecision[],
    stats: PatternSessionStats
  ): PatternSessionStats {
    return {
      ...stats,
      totalFiles: stats.totalFiles + decisions.length,
      reuseCandidates: stats.reuseCandidates + decisions.filter(d => d.shouldReuse).length,
      discardedCandidates: stats.discardedCandidates + decisions.filter(d => !d.shouldReuse).length,
      averageReuseConfidence: stats.reuseCandidates > 0 
        ? decisions.reduce((sum, d) => sum + d.confidence, 0) / stats.reuseCandidates
        : stats.averageReuseConfidence,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate optimization report for human-readable insights
   */
  generateReport(decisions: FileReuseDecision[], stats: PatternSessionStats): string {
    const reuseCount = decisions.filter(d => d.shouldReuse).length;
    const discardCount = decisions.filter(d => !d.shouldReuse).length;
    
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

