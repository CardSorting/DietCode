/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implement Domain contracts, isolate I/O details
 * Prework Status: 
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - [HARDEN] Production execution environment (currently mock assertions)
 *   - [HARDEN] Add IDE-aware formatter integration
 *   - [HARDEN] Implement real-time counterexample generation
 *   - [HARDEN] Add timeout configuration with backoff
 *   - [HARDEN] Production logger integration
 * 
 * Infrastructure implementation of VerificationAgent for test case verification.
 * Adapts testing frameworks and assertion libraries to Domain contract.
 */

import { VerificationAgent } from '../../domain/prompts/VerificationAgent';
import type { 
  TestCase, 
  VerificationResult, 
  VerificationVerdict,
  Counterexample 
} from '../../domain/prompts/VerificationTypes';

/**
 * Default assertion implementation
 */
class DefaultAssertionChecker {
  /**
   * Checks if an assertion passes (simple value comparison)
   */
  static assert(
    condition: string,
    expected: any,
    observed: any
  ): { passed: boolean; counterexample?: Counterexample } {
    const passed = expected === observed;
    
    if (!passed) {
      return {
        passed: false,
        counterexample: {
          assertionId: 'default',
          input: observed, // Current observed value
          expected,
          observed,
          reasoning: `Assertion "${condition}" failed: expected ${JSON.stringify(expected)} but got ${JSON.stringify(observed)}`
        }
      };
    }
    
    return { passed: true };
  }
}

/**
 * Infrastructure adapter for VerificationAgent
 * Implements test execution, assertion verification, and counterexample generation
 * 
 * @example
 * ```typescript
 * const adapter = new VerificationAgentAdapter({
 *   timeout: 5000,
 *   maxRetries: 3,
 *   logFailures: true
 * });
 * const result = await adapter.verify(testCase);
 * ```
 */
export class VerificationAgentAdapter implements VerificationAgent {
  private config: {
    timeout: number;
    maxRetries: number;
    failureThreshold: number;
    logFailures: boolean;
  };

  constructor(config: Partial<typeof this.config> = {}) {
    this.config = {
      timeout: config.timeout ?? 5000,
      maxRetries: config.maxRetries ?? 3,
      failureThreshold: config.failureThreshold ?? 70,
      logFailures: config.logFailures ?? true
    };
  }

  async verify(testCase: TestCase): Promise<VerificationResult> {
    const startTime = Date.now();
    let passedAssertions = 0;
    let failedAssertions = 0;
    const totalAssertions = testCase.assertions.length;
    const counterexamples: string[] = [];
    
    // Execute each assertion
    const assertionResults = await Promise.all(
      testCase.assertions.map(async (assertion) => {
        const result = DefaultAssertionChecker.assert(
          assertion.condition,
          assertion.expected,
          undefined // Mock: in real implementation, this would execute the code
        );

        if (result.passed) {
          passedAssertions++;
        } else {
          failedAssertions++;
          if (this.config.logFailures && result.counterexample) {
            counterexamples.push(result.counterexample.reasoning);
          }
        }

        return {
          assertionId: assertion.id,
          status: result.passed ? 'PASS' : 'FAIL',
          condition: assertion.condition,
          expected: assertion.expected,
          observed: undefined,
          timestamp: new Date(startTime),
          executionDurationMs: 0
        };
      })
    );

    // Determine verdict based on threshold
    const passRate = (passedAssertions / totalAssertions) * 100;
    let verdict: VerificationVerdict;
    if (failedAssertions > 0) verdict = 'PARTIAL';
    else if (passRate >= 100) verdict = 'PASS';
    else verdict = 'FAIL';

    const rationale = this.buildRationale(
      verdict,
      passRate,
      failedAssertions,
      totalAssertions
    );

    return {
      verdict,
      testCaseId: testCase.id,
      passedAssertions,
      failedAssertions,
      totalAssertions,
      timestamp: new Date(startTime),
      counterexamples: counterexamples.length > 0 ? counterexamples : undefined,
      rationale
    };
  }

  async validate(result: VerificationResult): Promise<boolean> {
    // Validate result structure
    if (!result.verdict) return false;
    
    // Validate verdict type
    if (!['PASS', 'FAIL', 'PARTIAL'].includes(result.verdict)) {
      return false;
    }
    
    // Validate counts
    if (
      result.passedAssertions < 0 ||
      result.failedAssertions < 0 ||
      result.totalAssertions <= 0
    ) {
      return false;
    }
    
    // Validate counts sum
    if (
      result.passedAssertions + result.failedAssertions !== result.totalAssertions
    ) {
      return false;
    }
    
    return true;
  }

  private buildRationale(
    verdict: VerificationVerdict,
    passRate: number,
    failedAssertions: number,
    totalAssertions: number
  ): string {
    const parts: string[] = [];
    
    parts.push(`Verdict: ${verdict}`);
    parts.push(`Assertion Pass Rate: ${passRate.toFixed(1)}% (${failedAssertions}/${totalAssertions} failed)`);
    
    if (verdict === 'FAIL') {
      parts.push('All assertions failed. Review implementation requirements.');
    } else if (verdict === 'PARTIAL') {
      parts.push('Some assertions passed but critical functionality is incomplete.');
    } else if (verdict === 'PASS') {
      parts.push('All assertions passed. System is functioning as expected.');
    }
    
    return parts.join('; ');
  }
}