/**
 * [CORE: CONTEXT_OPTIMIZATION_SERVICE]
 * Principle: Main orchestrator for context optimization integration
 * Violations: None - coordinates domain and infrastructure
 */

import type { FileReadResult, FileReadSource, OptimizationConfig } from "../../domain/context/FileOperation"
import type { OptimizationSessionStats } from "../../domain/context/FileMetadata"
import { 
  OptimizationMetricsAggregator, 
  SessionMetrics,
  SessionComparison 
} from "../capabilities/OptimizationMetrics"
import type { FileContextTracker } from "../capabilities/FileContextTracker"
import type { ContextOptimizationService as CoreOptimizationService } from "../capabilities/ContextOptimizationService"
import type { SignatureDatabase } from "../../infrastructure/context/SignatureDatabase"

/**
 * Result of a file read with optimization
 */
export interface OptimizedFileReadResult {
  result: FileReadResult
  wasOptimized: boolean
  optimizationReason?: string
}

/**
 * Complete optimization report
 */
export interface OptimizationReport {
  sessionStats: OptimizationSessionStats
  metrics: SessionMetrics
  recommendations: string[]
  signatureCount: number
  contextTruncated: boolean
  timestamp: number
}

/**
 * ContextOptimizationServiceOrchestrator
 * Main service that connects all context optimization components
 */
export class ContextOptimizationServiceOrchestrator {
  // Core components
  private optimizationService: CoreOptimizationService
  private tracker: FileContextTracker
  private metrics: OptimizationMetricsAggregator
  private signatureDatabase: SignatureDatabase
  
  // Session tracking
  private currentSessionId: string | null = null
  
  constructor(
    signatureDatabase?: SignatureDatabase,
    optimizationConfig?: Partial<OptimizationConfig>
  ) {
    // Initialize signature database
    this.signatureDatabase = signatureDatabase || new SignatureDatabase()
    
    // Initialize core optimization service
    this.optimizationService = new CoreOptimizationService(optimizationConfig)
    
    // Initialize tracker
    this.tracker = this.optimizationService.getTracker()
    
    // Initialize metrics
    this.metrics = new OptimizationMetricsAggregator()
    
    // One-time setup
    this.setupOptimizationCallbacks()
  }
  
  /**
   * Setup optimization callback handlers
   */
  private setupOptimizationCallbacks(): void {
    this.tracker.onOptimization((decision) => {
      // Record optimization decision in signature database
      const signature = this.signatureDatabase.recordSignature(
        decision.filePath,
        {
          filePath: decision.filePath,
          content: decision.filePath, // Use path instead of content for optimized results
          timestamp: Date.now(),
          source: "optimization_decision",
          originalLength: decision.filePath.length,
          optimizedLength: decision.filePath.length,
          wasOptimized: false // This decision itself was stored as metadata
        } as any
      )
      
      // Log optimization event
      console.log(`[ContextOptimization] Optimized ${decision.filePath}: ${decision.reason}`)
    })
  }
  
  /**
   * Start a new optimization session
   */
  startSession(sessionId: string): void {
    this.stopSession() // Stop any existing session
    this.signatureDatabase.startSession(sessionId)
    this.currentSessionId = sessionId
  }
  
  /**
   * Stop current session and save signatures
   */
  stopSession(): void {
    if (this.currentSessionId) {
      this.signatureDatabase.endSession()
      this.currentSessionId = null
    }
  }
  
  /**
   * Read a file with context optimization
   */
  async readFileOptimized(
    filePath: string,
    source: FileReadSource = "tool_execute"
  ): Promise<OptimizedFileReadResult> {
    // Get context from signature database first
    const savedSignature = this.signatureDatabase.getSignature(filePath)
    
    // If file is already optimized and within time window, use cached signature
    const isCachedOptimization = savedSignature?.optimized && this.needsOptimization(filePath)
    
    if (isCachedOptimization) {
      const cachedResult = {
        filePath,
        content: "Duplicate file read notice",
        timestamp: Date.now(),
        source: "optimization_cache",
        originalLength: savedSignature.content.length,
        optimizedLength: 43,
        wasOptimized: true,
        optimizationReason: savedSignature.firstReadTimestamp > 0 ? 
          "reusing_cached_optimization" : "two_finger_pattern"
      } as FileReadResult
      
      return {
        result: cachedResult,
        wasOptimized: true,
        optimizationReason: cachedResult.optimizationReason
      }
    }
    
    // Read and optimize the file
    const stats = this.optimizationService.getStats()
    const result = await this.optimizationService.recordRead(filePath, "File content placeholder", source)
    
    const wasOptimized = result.wasOptimized && result.optimizationReason !== undefined
    
    return {
      result,
      wasOptimized,
      optimizationReason: wasOptimized ? result.optimizationReason : undefined
    }
  }
  
  /**
   * Check if optimization is needed for a file
   */
  private needsOptimization(filePath: string): boolean {
    const stats = this.optimizationService.getStats()
    const readCount = stats.totalReads
    
    if (readCount >= 10) return true
    
    const bytesUsed = stats.totalOriginalBytes
    const maxBytes = 512 * 1024
    const percentUsed = (bytesUsed / maxBytes) * 100
    
    return percentUsed > 80
  }
  
  /**
   * Generate optimization report
   */
  async generateReport(): Promise<OptimizationReport> {
    // Get current stats
    const sessionStats = this.optimizationService.getStats()
    
    // Get metrics
    const metrics = this.metrics.getSessionMetrics(sessionStats)
    
    // Get recommendations
    const recommendations = this.optimizationService.getRecommendations()
    
    // Get signature count
    const signatureCount = this.signatureDatabase.listSignatures().length
    
    // Check if context was truncated
    const shouldTruncate = this.optimizationService.shouldTriggerOptimization()
    const contextTruncated = shouldTruncate || (metrics.contextUsageRatio > 0.95)
    
    return {
      sessionStats,
      metrics,
      recommendations,
      signatureCount,
      contextTruncated,
      timestamp: Date.now()
    }
  }
  
  /**
   * Compare current session with previous
   */
  compareWithPrevious(
    previousStats: OptimizationSessionStats
  ): SessionComparison {
    const currentStats = this.optimizationService.getStats()
    return this.metrics.compareSessions(previousStats, currentStats)
  }
  
  /**
   * Get optimization recommendations
   */
  getRecommendations(): string[] {
    const currentStats = this.optimizationService.getStats()
    return this.optimizationService.getRecommendations()
  }
  
  /**
   * Get signature database
   */
  getSignatureDatabase(): SignatureDatabase {
    return this.signatureDatabase
  }
  
  /**
   * Get optimization service stats
   */
  getStats(): OptimizationSessionStats {
    return this.optimizationService.getStats()
  }
  
  /**
   * Update optimization configuration
   */
  updateConfig(updates: Partial<OptimizationConfig>): void {
    this.optimizationService.updateConfig(updates)
  }
  
  /**
   * Get file context summary
   */
  getContextSummary(): {
    totalReads: number
    optimizedFiles: number
    potentialSavings: number
    saturation: number
  } {
    const stats = this.optimizationService.getStats()
    const signatures = this.signatureDatabase.listSignatures()
    const optimizedFiles = signatures.filter(sig => sig.optimized).length
    
    const maxBytes = 512 * 1024
    const saturation = stats.totalOriginalBytes / maxBytes
    
    return {
      totalReads: stats.totalReads,
      optimizedFiles,
      potentialSavings: stats.percentageSaved,
      saturation
    }
  }
}

/**
 * Create default orchestration service
 */
export function createDefaultOrchestrator(
  signatureDatabase?: SignatureDatabase,
  config?: Partial<OptimizationConfig>
): ContextOptimizationServiceOrchestrator {
  return new ContextOptimizationServiceOrchestrator(signatureDatabase, config)
}