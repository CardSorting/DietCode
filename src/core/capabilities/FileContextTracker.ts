/**
 * [CORE: FILE_CONTEXT_TRACKER]
 * Principle: Orchestrates file tracking and duplicate detection
 * Violations: None - uses Dependency Inversion for Infrastructure
 */

import type { FileReadResult, FileReadSource } from "../../domain/context/FileOperation"
import type {
  ReadEntry,
  DuplicateReadMetadata,
  FileOptimizationDecision,
  OptimizationSessionStats
} from "../../domain/context/FileMetadata"
import { 
  isReadDuplicate,
  aggregateReadMetadata 
} from "../../domain/context/FileMetadata"
import type { OptimizationConfig } from "../../domain/context/ContextOptimizationPolicy"
import { defaultOptimizationConfig } from "../../domain/context/ContextOptimizationPolicy"
import { EventType } from "../../domain/Event"
import { EventBus } from "../../core/orchestration/EventBus"

/**
 * FileContextTracker manages tracking of file reads and duplicate detection
 * Uses a configurable optimization policy to decide which reads to keep
 */
export class FileContextTracker {
  // Buffer of recent file read entries
  private readBuffer: ReadEntry[] = []
  
  // Cached metadata for files
  private fileMetadata: Map<string, DuplicateReadMetadata> = new Map()
  
  // Configuration
  private config: OptimizationConfig
  
  // Session tracking
  private sessionStartTimestamp: number
  
  // Callback for optimization events
  private optimizationCallback?: (decision: FileOptimizationDecision) => void
  
  constructor(config?: Partial<OptimizationConfig>) {
    this.config = {
      ...defaultOptimizationConfig,
      ...config
    }
    this.sessionStartTimestamp = Date.now()
  }
  
  /**
   * Register an optimization event callback
   */
  onOptimization(callback: (decision: FileOptimizationDecision) => void): void {
    this.optimizationCallback = callback
  }
  
  /**
   * Record a file read operation
   * @returns The optimized file read result
   */
  async recordRead(filePath: string, content: string, source: FileReadSource): Promise<FileReadResult> {
    const entry: ReadEntry = {
      filePath,
      content,
      timestamp: Date.now(),
      contentHash: await this.calculateHash(content),
      source,
      originalLength: content.length
    }
    
    return this.processReadEntry(entry)
  }
  
  /**
   * Record multiple file reads in a batch
   */
  async recordBatchReads(reads: { filePath: string; content: string; source: FileReadSource }[]): Promise<FileReadResult[]> {
    const results: FileReadResult[] = []
    for (const read of reads) {
      results.push(await this.recordRead(read.filePath, read.content, read.source))
    }
    return results
  }
  
  /**
   * Get read entries in the current buffer
   */
  getReadBuffer(): ReadEntry[] {
    return [...this.readBuffer]
  }
  
  /**
   * Get optimization statistics for the current session
   */
  getSessionStats(): OptimizationSessionStats {
    const { duplicateMetadata } = aggregateReadMetadata(this.readBuffer)
    const applicableFiles = Array.from(duplicateMetadata.keys())
    const totalOriginalBytes = this.readBuffer.reduce((sum, e) => sum + e.originalLength, 0)
    
    // Simple calculation for stats - in a real scenario this would track actual savings
    return {
      totalReads: this.readBuffer.length,
      duplicateReads: applicableFiles.length,
      totalOriginalBytes,
      totalOptimizedBytes: totalOriginalBytes, // Placeholder
      bytesSaved: 0,
      percentageSaved: 0,
      applicableFiles,
      duplicatesProcessed: 0,
      sessionStartTime: this.sessionStartTimestamp
    }
  }
  
  /**
   * Clear the read buffer (starts fresh session)
   */
  clearBuffer(): void {
    this.readBuffer = []
    this.fileMetadata.clear()
  }
  
  /**
   * Process a single read entry
   */
  private processReadEntry(entry: ReadEntry): FileReadResult {
    // Check if read is a duplicate within window
    const duplicateMetadata = this.getFileDuplicateMetadata(entry.filePath)
    const isDuplicate = this.detectDuplicateRead(entry, duplicateMetadata)
    
    let result: FileReadResult
    
    if (isDuplicate) {
      // Apply two-finger pattern if enabled
      if (this.config.enableTwoFinger) {
        result = this.applyTwoFingerPattern(entry.filePath)
        
        if (this.optimizationCallback) {
          this.optimizationCallback({
            filePath: entry.filePath,
            keepOriginal: false,
            applyTwoFingerPattern: true,
            duplicateWindowMs: this.config.duplicateWindowMs,
            savingsThreshold: this.config.savingsThreshold,
            calculatedSavings: calculateSavingsPercentage(
              duplicateMetadata.firstReadContentHash.length,
              43 // "Duplicate file read notice".length
            ),
            reason: `duplicate_within_${this.config.duplicateWindowMs}ms_window`
          })
        }
      } else {
        // Keep original but track as duplicate
        result = {
          ...entry,
          optimizedLength: entry.originalLength,
          wasOptimized: false,
          hash: entry.contentHash,
          sizeBytes: entry.originalLength
        }
      }
      
      // Update metadata
      this.updateFileMetadata(entry.filePath, entry.timestamp, duplicateMetadata)
    } else {
      // New unique read - add to buffer
      result = {
        ...entry,
        optimizedLength: entry.originalLength,
        wasOptimized: false,
        hash: entry.contentHash,
        sizeBytes: entry.originalLength
      }
      
      // Add to buffer
      this.readBuffer.push(entry)
      
      // Update metadata
      duplicateMetadata.firstReadTimestamp = entry.timestamp
      duplicateMetadata.firstReadContentHash = entry.contentHash
      duplicateMetadata.duplicateCount = 1
      duplicateMetadata.subsequentReadTimestamps = []
      duplicateMetadata.isDuplicate = false
      
      this.fileMetadata.set(entry.filePath, duplicateMetadata)
      
      // Check if should trigger optimization window
      if (this.shouldTriggerOptimization()) {
        void this.triggerOptimizationWindow()
      }
    }
    
    return result
  }
  
  /**
   * Apply two-finger pattern optimization
   */
  private applyTwoFingerPattern(filePath: string): FileReadResult {
    return {
      filePath,
      content: "Duplicate file read notice",
      timestamp: Date.now(),
      source: "context_optimization",
      originalLength: this.fileMetadata.get(filePath)?.firstReadContentHash.length || filePath.length + 43,
      optimizedLength: 43,
      wasOptimized: true,
      optimizationReason: "two_finger_pattern",
      hash: "duplicate-notice-" + Date.now(),
      sizeBytes: 43
    }
  }
  
  /**
   * Get duplicate metadata for a file
   */
  private getFileDuplicateMetadata(filePath: string): DuplicateReadMetadata {
    const existing = this.fileMetadata.get(filePath)
    if (!existing) {
      return {
        filePath,
        firstReadTimestamp: 0,
        subsequentReadTimestamps: [],
        firstReadContentHash: "",
        duplicateCount: 0,
        isDuplicate: false
      }
    }
    return existing
  }
  
  /**
   * Check if a read is a duplicate
   */
  private detectDuplicateRead(
    entry: ReadEntry,
    metadata: DuplicateReadMetadata
  ): boolean {
    if (metadata.duplicateCount === 0) return false
    
    // Check if within time window
    const mostRecentRead = this.readBuffer[this.readBuffer.length - 1]
    const timeSinceFirstRead = Date.now() - metadata.firstReadTimestamp
    const timeWindowExceeded = timeSinceFirstRead > this.config.duplicateWindowMs
    
    return !timeWindowExceeded && entry.contentHash === metadata.firstReadContentHash
  }
  
  /**
   * Update file metadata with new timestamp
   */
  private updateFileMetadata(
    filePath: string,
    timestamp: number,
    metadata: DuplicateReadMetadata
  ): void {
    metadata.lastReadTimestamp = timestamp
    metadata.duplicateCount++
    metadata.subsequentReadTimestamps.push(timestamp)
    metadata.isDuplicate = true
    
    this.fileMetadata.set(filePath, metadata)
    
    // Keep only recent duplicates (to prevent memory bloat)
    if (metadata.subsequentReadTimestamps.length > 100) {
      metadata.subsequentReadTimestamps.shift()
    }
  }
  
  /**
   * Check if optimization window should be triggered
   */
  private shouldTriggerOptimization(): boolean {
    const stats = this.getSessionStats()
    const readCount = stats.totalReads
    const bytesUsed = stats.totalOriginalBytes
    
    return (
      readCount >= 10 || 
      bytesUsed > 512 * 1024 // 512KB
    )
  }
  
  /**
   * Trigger optimization window and return optimized entries
   */
  private async triggerOptimizationWindow(): Promise<void> {
    const eventBus = EventBus.getInstance()
    const correlationId = Date.now().toString()
    
    eventBus.publish(EventType.CONTEXT_OPTIMIZATION, {
      message: `Optimization window triggered (${this.readBuffer.length} reads)`,
      readCount: this.readBuffer.length,
      totalBytes: this.readBuffer.reduce((sum, e) => sum + e.originalLength, 0)
    }, { correlationId })
    
    this.readBuffer = []
    this.fileMetadata.clear()
  }
  
  /**
   * Calculate content hash using crypto modules
   * Returns a stable hash for duplicate detection
   */
  private async calculateHash(content: string): Promise<string> {
    try {
      // Use crypto.subtle for production-quality hashing
      const encoder = new TextEncoder()
      const data = encoder.encode(content)
      const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data)
      
      // Convert buffer to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      
      return hashHex
    } catch (error) {
      // Fallback to simple hash if crypto fails
      console.error('Failed to compute hash, using fallback:', error)
      let hash = 0
      for (let i = 0; i < content.length; i++) {
        const chr = content.charCodeAt(i)
        hash = ((hash << 5) - hash) + chr
        hash = (hash & hash) >>> 0
      }
      return hash.toString(36)
    }
  }
}

/**
 * Helper function to calculate savings percentage
 */
function calculateSavingsPercentage(originalLength: number, optimizedLength: number): number {
  if (originalLength === 0) return 0
  const savings = originalLength - optimizedLength
  return (savings / originalLength) * 100
}