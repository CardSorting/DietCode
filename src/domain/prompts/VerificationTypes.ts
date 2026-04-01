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
export type ExpectedValue = any;

/**
 * Actual observed value from verification
 */
export type ObservedValue = any;

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
  metadata?: Record<string, any>;
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
  input: any;
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