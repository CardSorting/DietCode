/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Deterministic file fingerprinting using SHA-256.
 * Implementation: Bun.Crypto or Node:Crypto based hashing.
 */

import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import type { FileSignature } from '../../domain/context/FileContextContract';

export class FileSignatureService {
  /**
   * Calculate SHA-256 hash of a file
   */
  async calculate(filePath: string): Promise<FileSignature | null> {
    try {
      const content = await readFile(filePath);
      const fileStat = await stat(filePath);

      const hash = createHash('sha256').update(content).digest('hex');

      return {
        hash,
        algorithm: 'sha256',
        timestamp: Date.now(),
        size: fileStat.size,
      };
    } catch (error) {
      // File likely deleted or inaccessible
      return null;
    }
  }

  /**
   * Compare two signatures
   */
  isEqual(sigA: FileSignature | string, sigB: FileSignature | string): boolean {
    const hashA = typeof sigA === 'string' ? sigA : sigA.hash;
    const hashB = typeof sigB === 'string' ? sigB : sigB.hash;
    return hashA === hashB;
  }
}
