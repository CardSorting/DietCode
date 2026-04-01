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
export interface DomainIntegrityScanner {
  /**
   * Scans the project for architectural integrity violations.
   */
  scan(projectRoot: string): Promise<IntegrityReport>;
}