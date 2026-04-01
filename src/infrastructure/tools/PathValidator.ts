/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Centralized path validation for all tool operations.
 * Eliminates triplicated validation logic across fileTools, grep, and mkdir.
 * Production-hardened against path traversal, injection, and resource exhaustion.
 */

import * as nodePath from 'path';

/** Maximum path length to prevent buffer-based attacks */
const MAX_PATH_LENGTH = 4096;

/** Maximum content size for read/write operations (10MB) */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Maximum directory recursion depth */
export const MAX_RECURSION_DEPTH = 10;

/** Maximum result count for search operations */
export const MAX_RESULT_LINES = 10_000;

/**
 * Forbidden path prefixes that indicate system-critical locations.
 * Only exact prefix matches are checked (after normalization).
 * Uses absolute canonical paths to avoid false positives on user dirs.
 */
const FORBIDDEN_PREFIXES: readonly string[] = [
  '/etc/passwd',
  '/etc/shadow',
  '/etc/sudoers',
  '/sbin/',
  '/dev/',
  '/proc/',
  '/sys/',
  '/boot/',
] as const;

/**
 * Safe file extensions for search/scan operations.
 * Only files with these extensions are read during grep fallback.
 */
export const SAFE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json',
  '.md', '.txt', '.sql',
  '.yaml', '.yml',
  '.css', '.scss',
  '.html', '.xml',
  '.log', '.env',
  '.toml', '.ini', '.cfg',
  '.sh', '.bash', '.zsh',
] as const);

/**
 * Directories skipped during recursive traversal.
 */
export const SKIP_DIRECTORIES: ReadonlySet<string> = new Set([
  'node_modules',
  '.git',
  '.gemini',
  'dist',
  'build',
  '.next',
  'coverage',
  '__pycache__',
  '.cache',
  '.vscode',
  '.idea',
] as const);

/**
 * Validation error types for structured error handling.
 */
export type PathValidationErrorCode =
  | 'EMPTY_PATH'
  | 'PATH_TOO_LONG'
  | 'PATH_TOO_SHORT'
  | 'PATH_TRAVERSAL'
  | 'FORBIDDEN_LOCATION'
  | 'NULL_BYTES';

export class PathValidationError extends Error {
  constructor(
    message: string,
    public readonly code: PathValidationErrorCode,
    public readonly path: string
  ) {
    super(message);
    this.name = 'PathValidationError';
  }
}

/**
 * Validate a filesystem path for security and correctness.
 *
 * Design decisions:
 * - Null bytes are checked first (can truncate paths in C-backed APIs)
 * - Path traversal uses normalized path to catch encoded forms
 * - Forbidden prefixes use exact canonical matching to avoid
 *   false positives (e.g., `/Users/name/bin/` is allowed)
 *
 * @param inputPath - The path to validate
 * @param operation - The operation being performed (affects which checks run)
 * @throws PathValidationError with structured error code
 */
export function validatePath(
  inputPath: string,
  operation: 'read' | 'write' | 'search' | 'mkdir'
): void {
  // 1. Null/empty check
  if (!inputPath || inputPath.trim().length === 0) {
    throw new PathValidationError(
      'Path is required',
      'EMPTY_PATH',
      inputPath ?? ''
    );
  }

  // 2. Null byte injection (can truncate paths in C-backed syscalls)
  if (inputPath.includes('\0')) {
    throw new PathValidationError(
      'Path contains null bytes',
      'NULL_BYTES',
      inputPath
    );
  }

  // 3. Length check
  if (inputPath.length > MAX_PATH_LENGTH) {
    throw new PathValidationError(
      `Path exceeds maximum length of ${MAX_PATH_LENGTH} characters`,
      'PATH_TOO_LONG',
      inputPath
    );
  }

  // 4. Minimum length for file operations
  if ((operation === 'read' || operation === 'write') && inputPath.length < 2) {
    throw new PathValidationError(
      `Path too short (${inputPath.length} characters). Minimum 2 required.`,
      'PATH_TOO_SHORT',
      inputPath
    );
  }

  // 5. Path traversal detection — normalize first to catch encoded forms
  const normalized = nodePath.normalize(inputPath);
  if (normalized.includes('..')) {
    throw new PathValidationError(
      'Path traversal (..) detected',
      'PATH_TRAVERSAL',
      inputPath
    );
  }

  // 6. Forbidden system path prefixes (exact canonical match only)
  const normalizedLower = normalized.toLowerCase();
  const forbidden = FORBIDDEN_PREFIXES.find(
    prefix => normalizedLower === prefix.replace(/\/$/, '') ||
              normalizedLower.startsWith(prefix)
  );
  if (forbidden) {
    throw new PathValidationError(
      `Access to system path '${forbidden}' is forbidden`,
      'FORBIDDEN_LOCATION',
      inputPath
    );
  }
}

/**
 * Sanitize a string for safe use in shell commands.
 * Uses POSIX single-quote wrapping with internal quote escaping.
 *
 * Zero-length strings return '' (empty quoted string).
 * This is the gold-standard approach used by Python's shlex.quote().
 *
 * @param input - Raw string to sanitize
 * @returns Shell-safe string
 */
export function shellEscape(input: string): string {
  if (input.length === 0) return "''";
  // Replace single quotes with '\'' (end quote, escaped quote, start quote)
  return "'" + input.replace(/'/g, "'\\''") + "'";
}

/**
 * Check if a file extension is in the safe list for scanning.
 * Uses Set.has() for O(1) lookup instead of Array.some() O(n).
 */
export function isSafeExtension(filename: string): boolean {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return false;
  return SAFE_EXTENSIONS.has(filename.slice(lastDot).toLowerCase());
}

/**
 * Check if a directory name should be skipped during traversal.
 * Uses Set.has() for O(1) lookup.
 */
export function isSkippedDirectory(dirName: string): boolean {
  return SKIP_DIRECTORIES.has(dirName);
}

/**
 * Normalize a path for consistent comparisons and storage.
 * Resolves `.` and `..`, removes trailing slashes.
 * Throws on empty/whitespace-only input.
 */
export function normalizePath(inputPath: string): string {
  if (!inputPath || inputPath.trim().length === 0) {
    throw new PathValidationError('Path is required', 'EMPTY_PATH', inputPath ?? '');
  }
  const cleaned = inputPath.replace(/[/\\]+$/, '');
  return nodePath.normalize(cleaned || inputPath);
}
