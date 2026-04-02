/**
 * [CORE: CONTEXT_OPTIMIZATION_SERVICE]
 * Principle: Orchestrates file read optimization decisions and saves
 * Violations: None - uses Dependency Inversion for Infrastructure
 */

import type { FileReadResult, FileReadSource } from "../../domain/context/FileOperation"
import type {
  OptimizationSessionStats,
  FileOptimizationDecision
} from "../../domain/context/FileMetadata"
import { FileContextTracker } from "./FileContextTracker"
import type { OptimizationConfig } from "../../domain/context/ContextOptimizationPolicy"
import { defaultOptimizationConfig } from "../../domain/context/ContextOptimizationPolicy"
import { EventType } from "../../domain/Event"
import { EventBus } from "../../core/orchestration/EventBus"

/**
 * ContextOptimizationService coordinates the optimization process
 * It decides which file reads to optimize and when to trigger truncation
 */
export class ContextOptimizationService {
  // The tracker that detects duplicates
  private tracker: FileContextTracker
  
  // Configuration
  private config: OptimizationConfig
  
  // Session state
  private isOptimizing: boolean = false
  
  constructor(config?: Partial<OptimizationConfig>) {
    this.config = {
      ...defaultOptimizationConfig,
      ...config
    }
    
    this.tracker = new FileContextTracker(this.config)
    
    // Register optimization callback
    this.tracker.onOptimization((decision) => {
      this.handleOptimizationDecision(decision)
    })
  }
  
  /**
   * Apply optimization config updates
   */
  updateConfig(updates: Partial<OptimizationConfig>): void {
    this.config = {
      ...this.config,
      ...updates
    }
    
    // Update tracker config if it supports updates
    this.tracker = new FileContextTracker(this.config)
  }
  
  /**
   * Record a file read with optimization checking
   * @returns The optimized file read result
   */
  async recordRead(filePath: string, content: string, source: FileReadSource = "tool_execute"): Promise<FileReadResult> {
    // Record the read
    const result = await this.tracker.recordRead(filePath, content, source)
    
    // Check if optimization window should trigger
    if (this.shouldTriggerOptimization()) {
      const stats = this.tracker.getSessionStats()
      this.triggerOptimizationMode(stats)
    }
    
    return result
  }
  
  /**
   * Get current optimization statistics
   */
  getStats(): OptimizationSessionStats {
    return this.tracker.getSessionStats()
  }
  
  /**
   * Get active tracker for direct access
   */
  getTracker(): FileContextTracker {
    return this.tracker
  }
  
  /**
   * Check if optimization should trigger now
   */
  shouldTriggerOptimization(): boolean {
    const stats = this.tracker.getSessionStats()
    
    if (stats.totalReads >= this.config.maxFileReadsPerSession) {
      return true
    }
    
    const bytesUsed = stats.totalOriginalBytes
    const maxBytes = this.config.maxContextSize
    const triggerPercent = this.config.optimizationTrigger / 100
    
    return bytesUsed > maxBytes * triggerPercent
  }
  
  /**
   * Trigger optimization mode (truncate context if needed)
   */
  private async triggerOptimizationMode(stats: OptimizationSessionStats): Promise<void> {
    if (this.isOptimizing) return
    
    this.isOptimizing = true
    
    try {
      // Calculate savings
      const savings = (stats.totalOriginalBytes - stats.totalOptimizedBytes) / stats.totalOriginalBytes * 100
      
      // Decision: truncate or optimize
      const shouldTruncate = savings < this.config.savingsThreshold
      
      if (shouldTruncate) {
        // Trigger context truncation
        await this.truncateContext()
      }
    } finally {
      this.isOptimizing = false
    }
  }
  
  /**
   * Trigger context truncation
   * In a full implementation, this would:
   * 1. Save optimized entries to signature database
   * 2. Truncate conversation history
   * 3. Clear read buffer
   */
  private async truncateContext(): Promise<void> {
    const eventBus = EventBus.getInstance()
    const correlationId = Date.now().toString()
    const stats = this.tracker.getSessionStats()
    
    eventBus.publish(EventType.CONTEXT_OPTIMIZATION, {
      message: `Context truncation triggered - savings below threshold (${this.config.savingsThreshold}%)`,
      threshold: this.config.savingsThreshold,
      savingsRemaining: (stats.percentageSaved || 0).toFixed(1)
    }, { correlationId })
    
    // Clear the read buffer to start fresh
    this.tracker.clearBuffer()
  }
  
  /**
   * Handle optimization decision from tracker
   */
  private handleOptimizationDecision(decision: FileOptimizationDecision): void {
    const eventBus = EventBus.getInstance()
    const correlationId = Date.now().toString()
    
    eventBus.publish(EventType.CONTEXT_OPTIMIZATION, {
      filePath: decision.filePath,
      optimizationApplied: decision.applyTwoFingerPattern,
      reason: decision.reason,
      calculatedSavings: decision.calculatedSavings.toFixed(1)
    }, { correlationId })
    
    // In a full implementation, this would:
    // - Save decision to signature database
    // - Update conversation history
    // - Notify listeners
  }
  
  /**
   * Analyze conversation history for optimization opportunities
   * This would scan previous messages for duplicate file content patterns
   */
  analyzeConversationHistory(): {
    duplicateFiles: string[]
    totalPotentialSavings: number
    summary: string
  } {
    const stats = this.tracker.getSessionStats()
    
    return {
      duplicateFiles: stats.applicableFiles,
      totalPotentialSavings: stats.percentageSaved,
      summary: `Found ${stats.duplicateReads} duplicate reads with ${stats.percentageSaved.toFixed(1)}% potential savings`
    }
  }
  
  /**
   * Get optimization recommendations
   */
  getRecommendations(): string[] {
    const stats = this.tracker.getSessionStats()
    const recommendations: string[] = []
    
    if (stats.duplicateReads > 0) {
      recommendations.push(
        `Context optimization: ${stats.percentageSaved.toFixed(1)}% savings from ${stats.duplicateReads} duplicates`
      )
    }
    
    if (stats.totalReads >= this.config.maxFileReadsPerSession) {
      recommendations.push(
        `Read limit reached: ${this.config.maxFileReadsPerSession} reads - consider refactoring`
      )
    }
    
    if (stats.totalOriginalBytes > this.config.maxContextSize) {
      const ratio = stats.totalOriginalBytes / this.config.maxContextSize
      recommendations.push(
        `Context size limit: ${(ratio * 100).toFixed(0)}% of max - consider truncation`
      )
    }
    
    return recommendations
  }
  
  /**
   * Complete an optimization session with finalization
   */
  async finalizeSession(): Promise<{
    stats: OptimizationSessionStats
    recommendations: string[]
    truncated: boolean
  }> {
    const stats = this.tracker.getSessionStats()
    const recommendations = this.getRecommendations()
    
    // Clear session state
    this.tracker.clearBuffer()
    
    return {
      stats,
      recommendations,
      truncated: false
    }
  }
}

/**
 * Create a default optimization service
 */
export function createOptimizationService(config?: Partial<OptimizationConfig>): ContextOptimizationService {
  return new ContextOptimizationService(config)
}