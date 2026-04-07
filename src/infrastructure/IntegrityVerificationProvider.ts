/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Concrete implementation of VerificationProvider using IntegrityScanner.
 */

import type { HealingRepository } from '../domain/healing/HealingRepository';
import type {
  VerificationProvider,
  VerificationResult,
} from '../domain/healing/VerificationProvider';
import type { IntegrityScanner } from '../domain/integrity/IntegrityScanner';

export class IntegrityVerificationProvider implements VerificationProvider {
  constructor(
    private scanner: IntegrityScanner,
    private repository: HealingRepository,
    private projectRoot: string,
  ) {}

  /**
   * Verifies that a specific architectural violation has been resolved by re-scanning.
   */
  async verifyResolution(violationId: string): Promise<VerificationResult> {
    const report = await this.scanner.scan(this.projectRoot);
    const violation = report.violations.find((v) => v.id === violationId);

    if (!violation) {
      return {
        isResolved: true,
        message: 'Violation no longer detected in codebase.',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      isResolved: false,
      message: `Violation still present: ${violation.message}`,
      timestamp: new Date().toISOString(),
    };
  }
}
