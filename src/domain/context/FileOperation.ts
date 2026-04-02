/**
 * [DOMAIN: FILE_OPERATION]
 * Principle: Pure business logic for file reading operations
 * Violations: None
 */

/**
 * Type representing different sources of file reads
 * This tracks where a file was read from (tool, mention, checkpoint, etc.)
 */
export type FileReadSource = 
  | "tool_execute"          // File read via tool execution
  | "tool_request"          // File referenced in tool request
  | "mention"               // File mentioned in conversation
  | "context_load"          // File loaded from context
  | "checkpoint_restore"    // File restored from checkpoint
  | "diff_reference"        // File referenced during diff operations
  | "search_result"         // File from search action
  | "context_optimization"  // Optimized duplicate read
  | "context_truncation"    // Read from truncated context
  | "optimization_cache"    // Read from optimization cache
  | "optimization_decision" // Record of an optimization decision
  | "vim_file_reader"       // File read via Vim protocol
  | "fallback"              // Fallback for failed optimizations

/**
 * Result of a file read operation optimization
 */
export interface FileReadResult {
  filePath: string
  content: string
  timestamp: number
  source: FileReadSource
  originalLength: number
  optimizedLength: number
  wasOptimized: boolean
  optimizationReason?: string
  hash: string
  sizeBytes: number
}

/**
 * Metadata tracked per file in the optimization system
 */
export interface FileMetadata {
  filePath: string
  firstReadTimestamp: number
  lastReadTimestamp: number
  readCount: number
  totalReadBytes: number
  totalOptimizedBytes: number
  lastModifiedTimestamp: number
  fileHash: string
  isOptimized: boolean
}