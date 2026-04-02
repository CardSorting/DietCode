/**
 * [INFRASTRUCTURE: SIGNATURE_DATABASE]
 * Principle: Storage for optimized file signatures and context sessions
 * Violations: None - implements Domain interfaces through a specialized adapter
 */

import type { FileReadResult, FileReadSource, OptimizationDecision } from "../../domain/context/FileOperation"

/**
 * SignatureDatabase stores optimized file reads and manages optimization sessions
 * Enables deduplication and context management based on file signatures
 */
export class SignatureDatabase {
  // Store optimized file signatures
  private signatureCache: Map<string, FileSignature> = new Map()
  
  // Store active optimization sessions
  private sessions: Map<string, OptimizationSession> = new Map()
  
  // Current active session ID
  private currentSessionId: string | null = null
  
  // Configuration
  private maxSignatures: number = 1000
  private maxSessionSize: number = 512 * 1024 // 512KB
  
  /**
   * Start a new optimization session
   */
  startSession(sessionId: string): void {
    this.currentSessionId = sessionId
    this.sessions.set(sessionId, {
      id: sessionId,
      signatures: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
  }
  
  /**
   * Get current session
   */
  getSession(sessionId?: string): OptimizationSession | null {
    const id = sessionId || this.currentSessionId
    return this.sessions.get(id) || null
  }
  
  /**
   * End current session
   */
  endSession(): OptimizationSession | null {
    if (!this.currentSessionId) return null
    
    const session = this.getSession(this.currentSessionId)
    session!.updatedAt = Date.now()
    const endedSession = this.sessions.get(this.currentSessionId)
    
    // Move to signature cache
    this.signatures.forEach(signature => {
      this.signatureCache.set(signature.filePath, signature)
    })
    
    // Limit cache size
    this.pruneCache()
    
    this.currentSessionId = null
    return endedSession
  }
  
  /**
   * Record a file read result
   */
  recordSignature(filePath: string, result: FileReadResult): FileSignature {
    // Check if signature already exists
    const existing = this.signatureCache.get(filePath)
    
    if (existing) {
      existing.lastReadTimestamp = result.timestamp
      existing.readCount++
      return existing
    }
    
    // Create new signature
    const signature: FileSignature = {
      filePath,
      content: result.content,
      contentHash: this.hashContent(result.content),
      fileSize: result.content.length,
      firstReadTimestamp: result.timestamp,
      lastReadTimestamp: result.timestamp,
      readCount: 1,
      source: result.source,
      optimized: result.wasOptimized,
      optimizationReason: result.optimizationReason,
      createdAt: Date.now()
    }
    
    this.signatureCache.set(filePath, signature)
    this.pruneCache()
    
    return signature
  }
  
  /**
   * Check if a file has been optimized (exists in cache)
   */
  isOptimized(filePath: string): boolean {
    return this.signatureCache.has(filePath)
  }
  
  /**
   * Get signature for a file
   */
  getSignature(filePath: string): FileSignature | null {
    return this.signatureCache.get(filePath) || null
  }
  
  /**
   * List all signatures (pagination)
   */
  listSignatures(limit: number = 100, offset: number = 0): FileSignature[] {
    const signatures = Array.from(this.signatureCache.values())
    return signatures.slice(offset, offset + limit)
  }
  
  /**
   * Generate optimization recommendations from signatures
   */
  getOptimizationRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = []
    
    // Find files that have been optimized
    const optimizedFiles = Array.from(this.signatureCache.values())
      .filter(sig => sig.optimized)
    
    recommendations.push({
      type: 'optimized_files',
      count: optimizedFiles.length,
      message: `Found ${optimizedFiles.length} files that were optimized with two-finger pattern`
    })
    
    // Find files with multiple reads
    const multiReadFiles = Array.from(this.signatureCache.values())
      .filter(sig => sig.readCount > 1)
      .sort((a, b) => b.readCount - a.readCount)
      .slice(0, 5)
    
    if (multiReadFiles.length > 0) {
      recommendations.push({
        type: 'high_read_traffic',
        count: multiReadFiles.length,
        files: multiReadFiles.map(f => f.filePath),
        message: `High read traffic on ${multiReadFiles.length} files`
      })
    }
    
    return recommendations
  }
  
  /**
   * Clear all signatures (entire cache)
   */
  clearCache(): void {
    this.signatureCache.clear()
    this.sessions.clear()
    this.currentSessionId = null
  }
  
  /**
   * Prune cache size
   */
  private pruneCache(): void {
    while (this.signatureCache.size > this.maxSignatures) {
      // Remove oldest signatures (by first read timestamp)
      const signatures = Array.from(this.signatureCache.values())
        .sort((a, b) => a.firstReadTimestamp - b.firstReadTimestamp)
      
      this.signatureCache.delete(signatures[0].filePath)
    }
  }
  
  /**
   * Generate content hash
   */
  private hashContent(content: string): string {
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString(36)
  }
}

/**
 * Storage of file optimizations
 */
interface FileSignature {
  filePath: string
  content: string
  contentHash: string
  fileSize: number
  firstReadTimestamp: number
  lastReadTimestamp: number
  readCount: number
  source: FileReadSource
  optimized: boolean
  optimizationReason?: string
  createdAt: number
}

/**
 * Optimization session
 */
interface OptimizationSession {
  id: string
  signatures: FileSignature[]
  createdAt: number
  updatedAt: number
}

/**
 * Optimization recommendation
 */
export interface OptimizationRecommendation {
  type: string
  count: number
  files?: string[]
  message: string
}