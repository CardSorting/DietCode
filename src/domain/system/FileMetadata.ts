/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic for file read operations.
 * Provides contract for complete file metadata (not how it was read).
 * Infrastructure adapters implement these metadata structures.
 *
 * Inspired by: ForgeFS FileInfo + complete file metadata pattern
 * Violations: None
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - [FINALIZE] Domain metadata interfaces for infrastructure implementation
 */
import type { FileErrorContext } from './FileError';

/**
 * Complete metadata tracking for file operations.
 * Captures what was actually read (size, encoding, MIME, hash, line counts).
 * Used for change detection, troubleshooting, and operation validation.
 */
export interface FileMetadata {
  /**
   * Absolute path to the file, preserved from input.
   */
  path: string;

  /**
   * Size of the file content in bytes.
   */
  sizeBytes: number;

  /**
   * MIME type of the file, determined by file command or heuristics.
   * Example: "text/plain", "application/json", "application/octet-stream"
   */
  mimeType?: string;

  /**
   * Whether the file contains binary content.
   * True if binary mode should be used (vs text mode).
   */
  isBinary: boolean;

  /**
   * Character encoding of the file content.
   * Determine by reading content and checking UTF-8 validity.
   */
  encoding: 'utf8' | 'binary' | 'unknown';

  /**
   * Unix timestamp of last modification in milliseconds.
   * Used for change detection and caching invalidation.
   */
  lastModifiedMs: number;

  /**
   * Number of lines in the file content (for text files).
   * Computed by splitting on newline characters.
   */
  contentLines: number;

  /**
   * SHA-256 hash of the content (hexadecimal string).
   * Matches what a subsequent whole-file read would produce.
   * Critical for change detection and integrity verification.
   */
  contentHash?: string;
}

/**
 * Result of a read operation including content and complete metadata.
 * Used by Core layer to track what was executed and validate results.
 */
export interface ReadFileResult {
  /**
   * Raw content from the file (or slice of it).
   * UTF-8 encoded string for text files, Buffer for binary.
   */
  content: string;

  /**
   * Complete metadata about the read operation.
   */
  metadata: FileMetadata;
}

/**
 * Result of a write operation including metadata.
 * Track what was written and compute metadata for future reads.
 */
export interface WriteFileResult {
  /**
   * Whether the write operation succeeded.
   */
  success: boolean;

  /**
   * Metadata about the written file (post-write).
   */
  metadata: FileMetadata;
}

/**
 * Container for file read error tracking.
 * Captures the file state at the time of failure (for debugging).
 */
export interface ReadFileError {
  /**
   * The file that failed.
   */
  path: string;

  /**
   * Metadata of the file at time of read.
   * Null if metadata could not be determined before error.
   */
  fileMetadata: FileMetadata | null;

  /**
   * Error context with operation-specific details.
   */
  context: FileErrorContext;

  /**
   * The original error from infrastructure.
   */
  originalError: unknown;
}

/**
 * Built-in proof of file existence and integrity.
 */
export interface BuildInProof {
  path?: string;
  hash?: string;
  size?: number;
  timestamp: number;
  status?: string;
  eventsCount?: number;
  conflictsCount?: number;
}
