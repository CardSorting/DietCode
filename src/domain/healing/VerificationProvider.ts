/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic — the heart of the application.
 */

export interface VerificationResult {
  isResolved: boolean;
  message: string;
  timestamp: string;
}

export interface VerificationProvider {
  /**
   * Verifies that a specific violation has been resolved.
   */
  verifyResolution(violationId: string): Promise<VerificationResult>;
}

/**
 * Healer definition - notifies providers when healing is needed.
 * Used for orchestrating healing workflows.
 */
export interface Healer {
  /**
   * Get all healing tasks for violations.
   */
  getHealingTasks(violations: VerificationResult[]): Promise<string[]>;

  /**
   * Execute healing for a specific violation.
   */
  performHealing(taskId: string): Promise<boolean>;
}
