/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic and contracts.
 * Defines the interface for integrity verification operations.
 */

import type { IntegrityReport } from '../memory/Integrity';

/**
 * Interface defined in Domain layer for integrity scanning.
 * Core layer defines the actual IntegrityService that implements this.
 * Infrastructure adapters inject this into domain components.
 */
export class IntegrityScanner {
  /**
   * Scans the project for architectural integrity violations.
   */
  async scan(projectRoot: string): Promise<IntegrityReport> {
    throw new Error('IntegrityScanner.scan() not implemented');
  }

  /**
   * Scans a single file for architectural integrity violations.
   */
  async scanFile(filePath: string, projectRoot: string): Promise<IntegrityReport> {
    throw new Error('IntegrityScanner.scanFile() not implemented');
  }
}
