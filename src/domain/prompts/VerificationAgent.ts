/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic, contracts, and rules — testable in isolation
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - None
 *
 * Domain contracts for verification agent functionality.
 * Defines the interface that infrastructure adapters must implement.
 */

import type { TestCase } from './VerificationTypes';

/**
 * Verification result verdict
 */
export type VerificationVerdict = 'PASS' | 'FAIL' | 'PARTIAL';

/**
 * Full verification result with detailed metrics
 */
export interface VerificationResult {
  verdict: VerificationVerdict;
  testCaseId: string;
  passedAssertions: number;
  failedAssertions: number;
  totalAssertions: number;
  timestamp: Date;
  counterexamples?: string[];
  rationale: string;
}

/**
 * Domain interface for verification agent
 * Infrastructure adapters must implement this interface
 *
 * @example
 * ```typescript
 * class VerificationAdapter implements VerificationAgent {
 *   async verify(testCase: TestCase): Promise<VerificationResult> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export interface VerificationAgent {
  /**
   * Verifies a test case against expected assertions
   *
   * @param testCase - The test case to verify
   * @returns Promise resolving to verification result
   *
   * @description
   * This method implements the core verification logic:
   * 1. Runs assertions against the code under test
   * 2. Tracks pass/fail status
   * 3. Generates counterexamples for failed assertions
   * 4. Emits comprehensive verdict
   */
  verify(testCase: TestCase): Promise<VerificationResult>;

  /**
   * Validates a verification result
   *
   * @param result - The result to validate
   * @returns Promise resolving to validation status
   *
   * @description
   * Ensures result integrity before consumption by orchestrator
   */
  validate(result: VerificationResult): Promise<boolean>;
}

/**
 * Verification agent factory for creating domain instances
 */
export class VerificationAgentFactory {
  private constructor() {}
  /**
   * Creates a new verification agent instance
   *
   * @param adapter - Infrastructure implementation of VerificationAgent
   * @returns Domain-provided verification agent wrapper
   *
   * @description
   * Provides dependency injection wrapper for infrastructure adapters
   */
  static createDomainAgent(adapter: VerificationAgent): VerificationAgent {
    return {
      async verify(testCase: TestCase): Promise<VerificationResult> {
        return adapter.verify(testCase);
      },
      async validate(result: VerificationResult): Promise<boolean> {
        return adapter.validate(result);
      },
    };
  }
}
