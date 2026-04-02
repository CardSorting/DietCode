/**
 * [CORE: FILE_CONTEXT_TRACKER]
 * Principle: Orchestrates file tracking and duplicate detection
 * Violations: None - uses Dependency Inversion for Infrastructure
 */

import type { FileReadResult, FileReadSource, OptimizationConfig } from "../../domain/context/FileOperation"
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
import type { ExtensionMessage } from "../events/ExtensionMessage"

/**
 * FileContextTracker manages tracking of file reads and duplicate detection
 * Uses a configurable optimization policy to decide which reads to keep
 */
export class FileContextTracker {
  // Buffer of recent file read entries
  private readBuffer: ReadEntry[] = []
  
  // Cached metadata for files
  private fileMetadata: Map<string, FileMetadataEntry> = new Map()
  
  // Configuration
  private config: OptimizationConfig
  
  // Session tracking
  private sessionStartTimestamp: number
  
  // Callback for optimization events
  private optimizationCallback?: (decision: FileOptimizationDecision) => void
  
  constructor(config?: Partial<OptimizationConfig>) {
    this.config = {
      ...config,
      enableTwoFinger: config?.enableTwoFinger ?? true,
      enableRos: config?.enableRos ?? false
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
  recordRead(filePath: string, content: string, source: FileReadSource): FileReadResult {
    const entry: ReadEntry = {
      filePath,
      content,
      timestamp: Date.now(),
      contentHash: this.calculateHash(content),
      source,
      originalLength: content.length
    }
    
    return this.processReadEntry(entry)
  }
  
  /**
   * Record multiple file reads in a batch
   */
  recordBatchReads(reads: { filePath: string; content: string; source: FileReadSource }[]): FileReadResult[] {
    return reads.map(read => this.recordRead(read.filePath, read.content, read.source))
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
    const applicableFiles = duplicateMetadata.size
    
    return {
      totalReads: this.readBuffer.length,
      duplicateReads: applicableFiles,
      totalOriginalBytes: this.readBuffer.reduce((sum, e) => sum + e.originalLength, 0),
      totalOptimizedBytes: 0, // Calculated on demand
      bytesSaved: 0, // Calculated on demand
      percentageSaved: 0, // Calculated on demand
      applicableFiles: Array.from(duplicateMetadata.keys()),
      duplicatesProcessed: applicableFiles,
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
          wasOptimized: false
        }
      }
      
      // Update metadata
      this.updateFileMetadata(entry.filePath, entry.timestamp, duplicateMetadata)
    } else {
      // New unique read - add to buffer
      result = {
        ...entry,
        wasOptimized: false
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
      optimizationReason: "two_finger_pattern"
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
    // In a full implementation, this would save optimized entries and clear buffer
    // For now, we just log and clear
    console.log(`FileContextTracker: Optimization window triggered (${this.readBuffer.length} reads)`)
    
    this.clearBuffer()
  }
  
  /**
   * Calculate content hash (simplified for now)
   */
  private calculateHash(content: string): string {
    // In production, use a proper hash function
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const chr = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + chr
      hash = hash & hash
    }
    return hash.toString(36)
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