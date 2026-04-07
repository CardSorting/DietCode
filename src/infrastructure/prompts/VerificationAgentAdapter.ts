/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implement Domain contracts, isolate I/O details
 */

import type { VerificationAgent, VerificationResult } from '../../domain/prompts/VerificationAgent';
import type { TestCase } from '../../domain/prompts/VerificationTypes';

export class VerificationAgentAdapter implements VerificationAgent {
  async verify(testCase: TestCase): Promise<VerificationResult> {
    const startTime = Date.now();
    const failureThreshold = testCase.failureThreshold ?? 0.7;

    let passed = 0;
    let failed = 0;
    const counterexamples: string[] = [];

    for (const assertion of testCase.assertions) {
      // Simulate verification (in real implementation, this would run actual code)
      const isPassed = Math.random() > failureThreshold;

      if (isPassed) {
        passed++;
      } else {
        failed++;
        counterexamples.push(assertion.condition);
      }
    }

    const totalAssertions = testCase.assertions.length;
    const executionTime = Date.now() - startTime;
    const verdict = this.determineVerdict(passed, failed);

    return {
      verdict,
      testCaseId: testCase.id,
      passedAssertions: passed,
      failedAssertions: failed,
      totalAssertions,
      timestamp: new Date(startTime + executionTime),
      counterexamples,
      rationale: `Verification complete: ${verdict} (${passed}/${failed} assertions passed)`,
    };
  }

  validate(result: VerificationResult): Promise<boolean> {
    if (!result) {
      return Promise.resolve(false);
    }

    if (!result.timestamp || !(result.timestamp instanceof Date)) {
      return Promise.resolve(false);
    }

    if (result.failedAssertions < 0 || result.passedAssertions < 0 || result.totalAssertions < 0) {
      return Promise.resolve(false);
    }

    return Promise.resolve(true);
  }

  private determineVerdict(passed: number, failed: number): 'PASS' | 'FAIL' | 'PARTIAL' {
    if (failed > 0) {
      return 'FAIL';
    }

    if (passed === 0) {
      return 'FAIL';
    }

    if (passed > 0 && failed === 0) {
      return 'PASS';
    }

    return 'PARTIAL';
  }
}
