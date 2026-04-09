/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Infrastructure implementation of content hashing for integrity verification.
 * Provides SHA-256 hash computation for file content and strings.
 *
 * Inspired by: ForgeFS hash computation (w_swap_pkg)
 * Violations: None
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - [IMPLEMENT] SHA-256 content hashing for integrity verification
 */
import * as crypto from 'node:crypto';

/**
 * Compute SHA-256 hash of string content.
 * Encodes content as UTF-8 before hashing.
 *
 * @param content - String content to hash
 * @returns SHA-256 hash in hexadecimal format
 */
export async function computeContentHash(content: string): Promise<string> {
  return new Promise((resolve) => {
    const hash = crypto.createHash('sha256');
    hash.update(content, 'utf8');
    resolve(hash.digest('hex'));
  });
}

/**
 * Compute SHA-256 hash of buffer content.
 * Directly hashes bytes without encoding.
 *
 * @param buffer - Buffer content to hash
 * @returns SHA-256 hash in hexadecimal format
 */
export function computeBufferHash(buffer: Buffer): string {
  const hash = crypto.createHash('sha256');
  hash.update(buffer);
  return hash.digest('hex');
}

/**
 * Compute SHA-256 hash by reading file from filesystem.
 * Efficient streaming implementation for large files.
 *
 * @param fs - Filesystem adapter
 * @param path - Path to file
 * @returns SHA-256 hash in hexadecimal format
 */
export async function computeFileHash(
  fs: any, // Filesystem adapter
  path: string,
): Promise<string> {
  try {
    // Read file in chunks for memory efficiency
    const stream = fs.readFileAsStream(path);
    const hash = crypto.createHash('sha256');

    for await (const chunk of stream) {
      hash.update(chunk);
    }

    return hash.digest('hex');
  } catch (error) {
    throw new Error(`Failed to compute file hash for ${path}: ${error}`);
  }
}

/**
 * Compute SHA-256 hash from string stream.
 * Processes text in chunks to avoid memory issues.
 *
 * @param text - String content to hash
 * @param chunkSize - Size of chunks to process (default: 65536 bytes)
 * @returns SHA-256 hash in hexadecimal format
 */
export async function computeStreamedContentHash(text: string, chunkSize = 65536): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    let pos = 0;

    function digestChunk() {
      if (pos >= text.length) {
        resolve(hash.digest('hex'));
        return;
      }

      const end = Math.min(pos + chunkSize, text.length);
      hash.update(text.slice(pos, end), 'utf8');
      pos = end;
      digestChunk();
    }

    digestChunk();
  });
}

/**
 * Verify content hash matches expected value.
 * Used for change detection and integrity verification.
 *
 * @param content - Content to verify
 * @param expectedHash - Expected SHA-256 hash
 * @returns Whether hash matches
 */
export async function verifyContentHash(content: string, expectedHash: string): Promise<boolean> {
  const computedHash = await computeContentHash(content);
  return computedHash === expectedHash;
}
