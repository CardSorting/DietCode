/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic, domain models, value objects
 * Violations: None
 *
 * Shared domain types for verification agent functionality.
 */

/**
 * Test case identifier
 */
export type TestCaseId = string;

/**
 * Test assertion condition description
 */
export type AssertionCondition = string;

/**
 * Expected value for an assertion
 */
export type ExpectedValue = unknown;

/**
 * Actual observed value from verification
 */
export type ObservedValue = unknown;

/**
 * Error details if assertion failed
 */
export interface AssertionError {
  condition: AssertionCondition;
  expected: ExpectedValue;
  observed: ObservedValue;
  location?: string;
  timestamp: Date;
}

/**
 * Test case structure
 */
export interface TestCase {
  id: TestCaseId;
  name: string;
  description?: string;
  codeUnderTest: string;
  assertions: Assertion[];
  failureThreshold?: number; // Default 70% for PASS/PARTIAL logic
  metadata?: Record<string, unknown>;
}

/**
 * Single assertion in a test case
 */
export interface Assertion {
  id: string;
  condition: AssertionCondition;
  expected: ExpectedValue;
  description?: string;
}

/**
 * Counterexample for failed assertion
 */
export interface Counterexample {
  assertionId: string;
  input: unknown;
  expected: ExpectedValue;
  observed: ObservedValue;
  reasoning: string;
}

/**
 * Assertion result status
 */
export type AssertionStatus = 'PASS' | 'FAIL' | 'SKIPPED';

/**
 * Complete assertion result with context
 */
export interface AssertionResult {
  assertionId: string;
  condition: AssertionCondition;
  status: AssertionStatus;
  expected: ExpectedValue;
  observed: ObservedValue;
  errorDetails?: AssertionError;
  timestamp: Date;
  executionDurationMs?: number;
}

/**
 * Verification result verdict
 */
export type VerificationVerdict = 'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'TIMEOUT' | 'PARTIAL';

/**
 * Complete verification result
 */
export interface VerificationResult {
  verdict: VerificationVerdict;
  timestamp: Date;
  totalAssertions: number;
  passedAssertions: number;
  failedAssertions: number;
  skippedAssertions: number;
  summary: string;
  detailedResults?: AssertionResult[];
}
