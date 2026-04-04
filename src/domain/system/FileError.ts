/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic: Structured error types for file operations.
 * Defines domain-specific error codes and error context structures.
 * Infrastructure adapters convert runtime errors into these structured types.
 *
 * Inspired by: ForgeFS's structured Error enum and throw-with-context pattern
 * Violations: None
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - [FINALIZE] Domain error types for infrastructure error wrapping
 */
import type { FileMetadata } from './FileMetadata';

/**
 * Context tracking for file operation errors.
 * Captures error-producing values for debugging and recovery.
 */
export interface FileErrorContext {
  /**
   * The operation that failed (read, read_range, write, etc).
   */
  operation: string;

  /**
   * The file path that caused the error.
   */
  path: string;

  /**
   * Specific line range for range operations.
   * Example: { start: 10, end: 15 } for read_range
   */
  lineRange?: { start: number; end: number };

  /**
   * Maximum acceptable size for operations (for validation).
   * Example: 50 * 1024 * 1024 for max file size check
   */
  maxSizeBytes?: number;

  /**
   * Count of retry attempts (for resilience tracking).
   */
  attemptCount?: number;
}

/**
 * Domain-specific file operation error codes.
 * Each error represents a distinct validation or I/O situation.
 */
export class FileErrorCode {
  private constructor() {}
  /**
   * Rejected because binary content detected.
   * Read operations should be text-only.
   */
  static readonly BINARY_DETECTED = 'WRONG_TYPE_BINARY';

  /**
   * Line range is invalid (start > end or start/end == 0).
   * Validation rule enforced for read_range operations.
   */
  static readonly LINE_RANGE_INVALID = 'VALIDATION_LineRange';

  /**
   * Requested line number exceeds total file lines.
   * Example: Reading line 15 from a 10-line file.
   */
  static readonly LINE_BEYOND_EOF = 'VALIDATION_LineBeyondEOF';

  /**
   * File contains invalid UTF-8 byte sequences.
   * Determined after reading entire file content.
   */
  static readonly UTF8_FAILURE = 'VALIDATION_InvalidUTF8';

  /**
   * Critical file system error during read/write operations.
   * Includes permission denied, device errors, or backend failures.
   */
  static readonly I_O_ERROR = 'IO_FAILED';

  /**
   * Path traversal detected (attempting to read outside base directory).
   * Security violation preventing directory escape.
   */
  static readonly PATH_TRAVERSAL = 'SECURITY_PathTraversal';

  /**
   * Insufficient permissions to access file/directory.
   * Could be readonly filesystem or insufficient user permissions.
   */
  static readonly PERMISSION_DENIED = 'SECURITY_PermissionDenied';

  /**
   * Requested file is a directory (not a regular file).
   * Feature enhancement: add directory-specific error type if needed.
   */
  static readonly IS_DIRECTORY = 'TYPE_IsDirectory';
}
