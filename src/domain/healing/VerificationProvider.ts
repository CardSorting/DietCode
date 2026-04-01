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
