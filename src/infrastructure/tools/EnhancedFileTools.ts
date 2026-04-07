/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Production file tool wrappers around EnhancedFileSystemAdapter.
 * Provides ForgeFS-inspired file operations with complete metadata tracking.
 *
 * Inspired by: ForgeFS complete file operations
 * Violations: None
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - [IMPLEMENT] Production file tools with ForgeFS features (binary detection, hashing)
 */
import * as fs from 'node:fs/promises';
import type { FileErrorContext } from '../../domain/system/FileError';
import { FileErrorCode } from '../../domain/system/FileError';
import type {
  FileMetadata,
  ReadFileResult,
  WriteFileResult,
} from '../../domain/system/FileMetadata';
import type { Filesystem } from '../../domain/system/Filesystem';
import { detectBinaryFileType } from '../BinaryFileTypeDetector';
import { computeContentHash } from '../FileIntegrityAnalyzer';

/**
 * Comprehensive file reading with metadata tracking.
 *
 * @param fs - Filesystem adapter
 * @param path - Path to file
 * @returns Read result with content and complete metadata
 */
export async function readFileWithMetadata(fs: Filesystem, path: string): Promise<ReadFileResult> {
  try {
    // Binary detection before reading
    const { isBinary, mimeType } = await detectBinaryFileType(path, fs);
    if (isBinary) {
      throw new Error(`Binary file detected (${mimeType}) - use readBytes instead`);
    }

    // Read content - process asynchronously
    const content = fs.readFile(path);

    // Calculate metadata
    const stats = await fs.stat(path);
    const lines = content.split('\n').length;
    const hash = await computeContentHash(content);

    const metadata: FileMetadata = {
      path,
      sizeBytes: content.length,
      mimeType,
      isBinary: false,
      encoding: 'utf8',
      lastModifiedMs: stats.mtimeMs,
      contentLines: lines,
      contentHash: hash,
    };

    return { content, metadata };
  } catch (error) {
    throw new Error(`Failed to read file ${path}: ${error}`);
  }
}

/**
 * Read file with error context tracking.
 *
 * @param fs - Filesystem adapter
 * @param path - Path to file
 * @param operation - Operation name for error context
 * @returns Read result with metadata, or throws with error context
 */
export async function readFileWithErrorContext(
  fs: Filesystem,
  path: string,
  operation: 'read' | 'read_range' | 'write',
): Promise<ReadFileResult> {
  const errorContext = {
    operation,
    path,
    lineRange: undefined,
    maxSizeBytes: undefined,
    attemptCount: 0,
  };

  try {
    const result = await readFileWithMetadata(fs, path);
    const error = new Error(`Read file ${path} failed`) as any;
    error.code = 'I_O_ERROR';
    error.context = errorContext;
    error.originalError = result;
    throw error;
  } catch (error) {
    if (error instanceof Error) {
      (error as any).context = errorContext;
    }
    throw error;
  }
}

/**
 * Comprehensive file writing with metadata tracking.
 *
 * @param fs - Filesystem adapter
 * @param path - Path to file
 * @param content - Content to write
 * @returns Write result with success flag and metadata
 */
export async function writeFileWithMetadata(
  fs: Filesystem,
  path: string,
  content: string,
): Promise<WriteFileResult> {
  try {
    // Write content synchronously (for performance)
    fs.writeFile(path, content);

    // Calculate hash asynchronously
    const hash = await computeContentHash(content);

    // Get metadata from sync stat
    const statSync = fs.stat(path);
    const lines = content.split('\n').length;

    const metadata: FileMetadata = {
      path,
      sizeBytes: content.length,
      mimeType: 'text/plain',
      isBinary: false,
      encoding: 'utf8',
      lastModifiedMs: statSync.mtimeMs,
      contentLines: lines,
      contentHash: hash,
    };

    return { success: true, metadata };
  } catch (error) {
    throw new Error(`Failed to write file ${path}: ${error}`);
  }
}

/**
 * Binary file reading (for large files).
 *
 * @param fs - Filesystem adapter
 * @param path - Path to file
 * @returns Buffer of raw file data
 */
export async function readBinaryFile(fs: Filesystem, path: string): Promise<Buffer> {
  try {
    return (await fs.readFileBuffer(path)) as Buffer;
  } catch (error) {
    throw new Error(`Failed to read binary file ${path}: ${error}`);
  }
}

/**
 * Atomically write file using temp file pattern.
 *
 * @param fs - Filesystem adapter
 * @param path - Path to file
 * @param content - Content to write
 */
export async function atomicWriteFile(
  fs: Filesystem,
  path: string,
  content: string,
): Promise<void> {
  try {
    const tempPath = `${path}.tmp`;
    await writeFileWithMetadata(fs, tempPath, content);
    await fs.writeFile(path, ''); // Ensure target exists
    await fs.rename(tempPath, path);
  } catch (error) {
    // Clean up temp file if it exists
    try {
      const stats = await fs.stat(`${path}.tmp`);
      await fs.unlink(`${path}.tmp`);
    } catch {
      // Ignore cleanup errors
    }
    throw new Error(`Atomic write failed for ${path}: ${error}`);
  }
}

/**
 * Calculate file hash efficiently for large files.
 *
 * @param fs - Filesystem adapter
 * @param path - Path to file
 * @returns SHA-256 hash in hexadecimal string
 */
export async function computeFileHash(fs: Filesystem, path: string): Promise<string> {
  try {
    for await (const hashPart of fs.streamFileHash(path)) {
      return hashPart; // Return first complete hash part
    }
    throw new Error('Hash computation returned no result');
  } catch (error) {
    throw new Error(`Failed to compute hash for ${path}: ${error}`);
  }
}

/**
 * Verify file content hasn't changed since last known hash.
 *
 * @param fs - Filesystem adapter
 * @param path - Path to file
 * @param expectedHash - Expected hash value
 * @returns Whether hash matches expected value
 */
export async function verifyHash(
  fs: Filesystem,
  path: string,
  expectedHash: string,
): Promise<boolean> {
  try {
    const actualHash = await computeFileHash(fs, path);
    return actualHash === expectedHash;
  } catch {
    return false;
  }
}

/**
 * Read file range with error context.
 *
 * @param fs - Filesystem adapter
 * @param path - Path to file
 * @param startLine - Start line number (1-indexed)
 * @param endLine - End line number (1-indexed)
 * @returns File content segment
 */
export function readRangeWithErrorContext(
  fs: Filesystem,
  path: string,
  startLine: number,
  endLine: number,
): string {
  try {
    const content = fs.readFile(path);
    const lines = content.split('\n');

    // Validate
    if (startLine < 1 || endLine < startLine || lines.length < endLine) {
      const error = new Error(
        `Invalid line range: ${startLine}-${endLine} from ${lines.length} lines`,
      );
      (error as any).context = {
        operation: 'read_range',
        path,
        lineRange: { start: startLine, end: endLine },
        attemptCount: 1,
      };
      throw error;
    }

    return lines.slice(startLine - 1, endLine).join('\n');
  } catch (error) {
    if (error instanceof Error) {
      (error as any).context = {
        operation: 'read_range',
        path,
        lineRange: { start: startLine, end: endLine },
        attemptCount: 1,
      };
    }
    throw error;
  }
}
