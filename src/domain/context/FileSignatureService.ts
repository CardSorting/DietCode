/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [DOMAIN: FILE_SIGNATURE_SERVICE]
 * Principle: Pure business logic for signature tracking and deduplication
 * Violations: None
 */

import type { FileReadResult } from './FileOperation';

/**
 * Metadata for a file signature used for context optimization
 */
export interface FileSignature {
  filePath: string;
  hash: string;
  sizeBytes: number;
  timestamp: number;
  isOutdated(currentSize?: number): boolean;
}

/**
 * Interface for the signature tracking database
 * This decouples core logic from persistence implementations (SQLite/Firebase)
 */
export interface SignatureDatabase {
  /**
   * Check if a file signature exists and is valid
   */
  hasValidSignature(filePath: string): boolean;

  /**
   * Retrieve a signature for a file
   */
  getSignature(filePath: string): FileReadResult | null;

  /**
   * Record a new signature for a file read
   */
  recordSignature(filePath: string, result: FileReadResult): void;

  /**
   * List all currently tracked signatures
   */
  listSignatures(): FileReadResult[];

  /**
   * Clear all signatures (e.g., on session reset)
   */
  clear(): void;

  /**
   * Prune old or invalid signatures to manage space
   */
  prune(maxAgeMs: number): void;
}
