/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: Orchestrates file read optimization decisions and context state.
 * Combined logic: Migration from Capabilities + Cline-inspired Guardian logic.
 *
 * Coordinates the optimization process and triggers context truncation when needed.
 */

import { EventBus } from '../../core/orchestration/EventBus';
import { EventType } from '../../domain/Event';
import type { OptimizationConfig } from '../../domain/context/ContextOptimizationPolicy';
import { defaultOptimizationConfig } from '../../domain/context/ContextOptimizationPolicy';
import type {
  FileOptimizationDecision,
  OptimizationSessionStats,
} from '../../domain/context/FileMetadata';
import type { FileReadResult, FileReadSource } from '../../domain/context/FileOperation';
import { FileContextTracker } from './FileContextTracker'; // Updated import

export class ContextOptimizationService {
  private tracker: FileContextTracker;
  private config: OptimizationConfig;
  private isOptimizing = false;

  constructor(config?: Partial<OptimizationConfig>) {
    this.config = {
      ...defaultOptimizationConfig,
      ...config,
    };

    // Use the consolidated tracker
    this.tracker = new FileContextTracker(this.config);

    this.tracker.onOptimization((decision) => {
      this.handleOptimizationDecision(decision);
    });
  }

  /**
   * Record a file read with optimization checking
   */
  async recordRead(
    filePath: string,
    content: string,
    source: FileReadSource = 'tool_execute',
  ): Promise<FileReadResult> {
    const result = await this.tracker.recordRead(filePath, content, source);

    if (this.shouldTriggerOptimization()) {
      const stats = this.tracker.getSessionStats();
      this.triggerOptimizationMode(stats);
    }

    return result;
  }

  /**
   * Check if context for a file is stale (Cline-inspired)
   */
  isStale(path: string): boolean {
    return this.tracker.isStale(path);
  }

  getStats(): OptimizationSessionStats {
    return this.tracker.getSessionStats();
  }

  getTracker(): FileContextTracker {
    return this.tracker;
  }

  shouldTriggerOptimization(): boolean {
    const stats = this.tracker.getSessionStats();
    if (stats.totalReads >= this.config.maxFileReadsPerSession) return true;

    const bytesUsed = stats.totalOriginalBytes;
    const maxBytes = this.config.maxContextSize;
    const triggerPercent = this.config.optimizationTrigger / 100;

    return bytesUsed > maxBytes * triggerPercent;
  }

  private async triggerOptimizationMode(stats: OptimizationSessionStats): Promise<void> {
    if (this.isOptimizing) return;
    this.isOptimizing = true;
    try {
      const savings =
        ((stats.totalOriginalBytes - stats.totalOptimizedBytes) / stats.totalOriginalBytes) * 100;
      const shouldTruncate = savings < this.config.savingsThreshold;
      if (shouldTruncate) {
        await this.truncateContext();
      }
    } finally {
      this.isOptimizing = false;
    }
  }

  private async truncateContext(): Promise<void> {
    const eventBus = EventBus.getInstance();
    const stats = this.tracker.getSessionStats();

    eventBus.publish(EventType.CONTEXT_OPTIMIZATION, {
      message: `Context truncation triggered - savings below threshold (${this.config.savingsThreshold}%)`,
      threshold: this.config.savingsThreshold,
      savingsRemaining: (stats.percentageSaved || 0).toFixed(1),
    });

    this.tracker.clearBuffer();
  }

  private handleOptimizationDecision(decision: FileOptimizationDecision): void {
    const eventBus = EventBus.getInstance();
    eventBus.publish(EventType.CONTEXT_OPTIMIZATION, {
      filePath: decision.filePath,
      optimizationApplied: decision.applyTwoFingerPattern,
      reason: decision.reason,
      calculatedSavings: decision.calculatedSavings.toFixed(1),
    });
  }

  updateConfig(updates: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...updates };
    // Re-initialize for new config (or update existing)
    this.tracker = new FileContextTracker(this.config);
  }

  getRecommendations(): string[] {
    const stats = this.tracker.getSessionStats();
    const recommendations: string[] = [];
    if (stats.duplicateReads > 0)
      recommendations.push(`Context optimization: ${stats.percentageSaved.toFixed(1)}% savings`);
    return recommendations;
  }
}
