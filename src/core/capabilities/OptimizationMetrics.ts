/**
 * [CORE: OPTIMIZATION_METRICS]
 * Principle: Calculates and reports optimization statistics
 * Violations: None - pure coordination logic
 */

import {
  calculateContextSavings,
  shouldTruncateContext,
} from '../../domain/context/ContextOptimizationPolicy';
import type { OptimizationSessionStats } from '../../domain/context/FileMetadata';
import { calculateSavingsPercentage } from '../../domain/context/FileMetadata';

/**
 * Optimization Metrics Aggregator
 * Provides reporting and analysis of context optimization performance
 */
export class OptimizationMetricsAggregator {
  /**
   * Get detailed metrics for a session
   */
  getSessionMetrics(stats: OptimizationSessionStats): SessionMetrics {
    const savings = stats.percentageSaved || 0;
    const contextRatio = stats.totalOriginalBytes / 512 / 1024; // MB ratio to 512KB
    const endTime = stats.sessionEndTime || Date.now();
    const readFrequency = stats.totalReads / ((endTime - stats.sessionStartTime) / 60000 || 1); // reads per minute

    // Convert to readable format
    const readableSavings = (savings / 100).toFixed(2);
    const readableBytes = (stats.totalOriginalBytes / 1024).toFixed(2);
    const readableBytesSaved = (stats.bytesSaved / 1024).toFixed(2);

    return {
      // Basic stats
      totalReads: stats.totalReads,
      duplicateReads: stats.duplicateReads,
      totalSizeMB: stats.totalOriginalBytes / 1024 / 1024,
      totalSizeKB: stats.totalOriginalBytes / 1024,

      // Optimization results
      bytesSaved: stats.bytesSaved,
      bytesSavedKB: stats.bytesSaved / 1024,
      percentageSaved: savings,
      effectiveSavingsKB: stats.bytesSaved / 1024,

      // Performance indicators
      duplicateRatio: stats.duplicateReads / (stats.totalReads || 1),
      readFrequencyPerMinute: readFrequency,
      efficiencyRating: this.calculateEfficiencyRating(savings, stats.duplicateReads),

      // Ratios and metrics
      contextUsageRatio: contextRatio,
      optimizationTriggerStatus: this.getTriggerStatus(stats.totalOriginalBytes),

      // Time metrics
      sessionDurationMs: stats.sessionEndTime
        ? stats.sessionEndTime - stats.sessionStartTime
        : Date.now() - stats.sessionStartTime,
      duplicateProcessingTime: 'N/A', // Would be tracked in full implementation

      // Recommendations
      recommendations: this.generateRecommendations(stats, savings, contextRatio),
    };
  }

  /**
   * Calculate efficiency rating (Optimal, High, Nominal, Low)
   */
  private calculateEfficiencyRating(
    savings: number,
    dups: number,
  ): 'OPTIMAL' | 'HIGH' | 'NOMINAL' | 'LOW' {
    if (savings > 50 || (savings > 30 && dups > 10)) return 'OPTIMAL';
    if (savings > 30 || (savings > 20 && dups > 5)) return 'HIGH';
    if (savings > 10) return 'NOMINAL';
    return 'LOW';
  }

  /**
   * Get optimization trigger status
   */
  private getTriggerStatus(bytesUsed: number): TriggerStatus {
    const MAX_SIZE = 512 * 1024; // 512KB
    const PERCENT = 80;

    const percentUsed = (bytesUsed / MAX_SIZE) * 100;
    const isOverTrigger = bytesUsed > MAX_SIZE * (PERCENT / 100);

    return {
      isOverTrigger,
      percentUsed,
      isNearLimit: percentUsed > 50,
      maxSizeLimit: MAX_SIZE,
      triggerPercent: PERCENT,
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    stats: OptimizationSessionStats,
    savings: number,
    contextRatio: number,
  ): string[] {
    const recommendations: string[] = [];

    // Savings-based recommendations
    if (stats.duplicateReads > 0) {
      if (savings >= 30) {
        recommendations.push(
          `✓ Excellent optimization: ${savings.toFixed(1)}% savings from duplicate handling`,
        );
      } else if (savings >= 15) {
        recommendations.push(
          `✓ Good optimization: ${savings.toFixed(1)}% savings from duplicate handling`,
        );
      } else {
        recommendations.push(`⚠ Optimization could be better: only ${savings.toFixed(1)}% savings`);
      }
    }

    // Read frequency recommendations
    const simpleFrequency = stats.totalReads > 0 ? 1 : 1; // Simplified calculation
    if (stats.totalReads > 20) {
      recommendations.push(
        `⚠ High read frequency: ${stats.totalReads} total reads may indicate inefficient caching`,
      );
    }

    // Context size recommendations
    if (contextRatio > 90) {
      recommendations.push(`⚠ Context near limit: ${(contextRatio).toFixed(0)}% of max size`);
    } else if (contextRatio > 70) {
      recommendations.push(
        `ℹ Context at ${(contextRatio).toFixed(0)}% of max size - consider proactive truncation`,
      );
    }

    // Duplicate ratio recommendations
    const dupRatio = stats.duplicateReads / (stats.totalReads || 1);
    if (dupRatio > 0.3) {
      recommendations.push(
        `⚠ High duplication ratio: ${(dupRatio * 100).toFixed(0)}% of reads are duplicates`,
      );
    }

    return recommendations;
  }

  /**
   * Compare two optimization sessions
   */
  compareSessions(
    oldStats: OptimizationSessionStats,
    newStats: OptimizationSessionStats,
  ): SessionComparison {
    const savingsDiff = calculateContextSavings(oldStats, newStats);
    const bytesDiff = newStats.bytesSaved - oldStats.bytesSaved;
    const improvement = bytesDiff > 0 ? 'improved' : 'deteriorated';

    return {
      savingsDelta: savingsDiff,
      bytesDelta: bytesDiff,
      improvement,
      isProductive: bytesDiff > 0,
    };
  }

  /**
   * Normalize metrics for display
   */
  normalizeForDisplay(metrics: SessionMetrics): DisplayMetrics {
    return {
      ...metrics,
      // Always use lowercase keys for display
      totalSizeMB: metrics.totalSizeMB.toFixed(2),
      totalSizeKB: metrics.totalSizeKB.toFixed(2),
      bytesSavedKB: metrics.bytesSavedKB.toFixed(2),
      percentageSaved: metrics.percentageSaved.toFixed(1),
      effectiveSavingsKB: metrics.effectiveSavingsKB.toFixed(2),
      bytesSaved: metrics.bytesSaved.toLocaleString(),
    };
  }
}

/**
 * Session Metrics Response
 */
export interface SessionMetrics {
  totalReads: number;
  duplicateReads: number;
  totalSizeKB: number;
  totalSizeMB: number;
  bytesSaved: number;
  bytesSavedKB: number;
  percentageSaved: number;
  effectiveSavingsKB: number;
  duplicateRatio: number;
  readFrequencyPerMinute: number;
  efficiencyRating: string;
  contextUsageRatio: number;
  optimizationTriggerStatus: TriggerStatus;
  sessionDurationMs: number;
  duplicateProcessingTime: string;
  recommendations: string[];
}

/**
 * display-ready metrics (lowercase keys)
 */
export interface DisplayMetrics {
  totalReads: number;
  duplicateReads: number;
  totalSizeMB: string;
  totalSizeKB: string;
  bytesSaved: string;
  bytesSavedKB: string;
  percentageSaved: string;
  effectiveSavingsKB: string;
  duplicateRatio: number;
  readFrequencyPerMinute: number;
  efficiencyRating: string;
  contextUsageRatio: number;
  optimizationTriggerStatus: TriggerStatus;
  sessionDurationMs: number;
  duplicateProcessingTime: string;
  recommendations: string[];
}

/**
 * Optimization trigger status
 */
export interface TriggerStatus {
  isOverTrigger: boolean;
  percentUsed: number;
  isNearLimit: boolean;
  maxSizeLimit: number;
  triggerPercent: number;
}

/**
 * Session comparison result
 */
export interface SessionComparison {
  savingsDelta: number;
  bytesDelta: number;
  improvement: 'improved' | 'deteriorated' | 'neutral';
  isProductive: boolean;
}
