/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Shared infrastructure type definitions for binary file detection.
 *
 * Inspired by: ForgeFS type system
 * Violations: None
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - [FINALIZE] Shared type definitions for binary detection
 */
/**
 * Binary detection operation result.
 * Used by BinaryFileTypeDetector to communicate detection outcomes.
 */
export interface BinaryDetectionResult {
  /**
   * Whether the file is binary.
   */
  isBinary: boolean;

  /**
   * MIME type from file command (if available).
   * Example: "application/octet-stream", "image/png"
   */
  mimeType?: string;

  /**
   * Human-readable binary type description.
   * Example: "PE executable (Microsoft)"
   */
  binaryType?: string;
}
