/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Centralized path validation for all tool operations.
 * Eliminates triplicated validation logic across fileTools, grep, and mkdir.
 * Production-hardened against path traversal, injection, and resource exhaustion.
 */

/** Maximum path length to prevent buffer-based attacks */
const MAX_PATH_LENGTH = 4096;

/** Maximum content size for read/write operations (10MB) */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Maximum directory recursion depth */
export const MAX_RECURSION_DEPTH = 10;

/** Maximum result count for search operations */
export const MAX_RESULT_LINES = 10_000;

/**
 * Forbidden path segments that indicate system-critical locations.
 * Checked case-insensitively and normalized.
 */
const FORBIDDEN_SEGMENTS: readonly string[] = [
  '/etc/passwd',
  '/etc/shadow',
  '/etc/sudoers',
  '/bin',
  '/sbin',
  '/dev',
  '/proc',
  '/sys',
  '/root',
  '/boot',
] as const;

/**
 * Safe file extensions for search/scan operations.
 * Only files with these extensions are read during grep fallback.
 */
export const SAFE_EXTENSIONS: readonly string[] = [
  '.ts', '.tsx', '.js', '.jsx', '.json',
  '.md', '.txt', '.sql',
  '.yaml', '.yml',
  '.css', '.scss',
  '.html', '.xml',
  '.log', '.env',
  '.toml', '.ini', '.cfg',
  '.sh', '.bash', '.zsh',
] as const;

/**
 * Directories skipped during recursive traversal.
 */
export const SKIP_DIRECTORIES: readonly string[] = [
  'node_modules',
  '.git',
  '.gemini',
  'dist',
  'build',
  '.next',
  'coverage',
  '__pycache__',
  '.cache',
] as const;

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

  // 2. Null byte injection (common attack vector)
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

  // 5. Path traversal detection (check before normalization)
  if (/\.\.[/\\]/.test(inputPath)) {
    throw new PathValidationError(
      'Path traversal (..) detected',
      'PATH_TRAVERSAL',
      inputPath
    );
  }

  // 6. Forbidden system paths
  const normalizedLower = inputPath.toLowerCase().replace(/\\/g, '/');
  const forbidden = FORBIDDEN_SEGMENTS.find(
    seg => normalizedLower === seg || normalizedLower.startsWith(seg + '/')
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
 * Escapes all shell-special characters.
 *
 * @param input - Raw string to sanitize
 * @returns Shell-safe string (single-quoted with internal quotes escaped)
 */
export function shellEscape(input: string): string {
  // Replace single quotes with escaped version, wrap in single quotes
  // This is the POSIX-safe approach: 'don'\''t' => don't
  return "'" + input.replace(/'/g, "'\\''") + "'";
}

/**
 * Check if a file extension is in the safe list for scanning.
 */
export function isSafeExtension(filename: string): boolean {
  return SAFE_EXTENSIONS.some(ext => filename.endsWith(ext));
}

/**
 * Check if a directory name should be skipped during traversal.
 */
export function isSkippedDirectory(dirName: string): boolean {
  return SKIP_DIRECTORIES.includes(dirName);
}
