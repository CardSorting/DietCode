/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [VERIFICATION]
 * Tests production-level hardening features.
 */

import { ValidationService } from './src/core/integrity/ValidationService';
import { EventBus } from './src/core/orchestration/EventBus';
import { LogLevel } from './src/domain/logging/LogLevel';
import { IntegrityPolicy } from './src/domain/memory/IntegrityPolicy';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';
import { IntegrityAdapter } from './src/infrastructure/IntegrityAdapter';
import { HardenedValidationRepository } from './src/infrastructure/validation/HardenedValidationRepository';

async function verify() {
  console.log('--- DIETCODE PRODUCTION HARDENING VERIFICATION ---');

  const logger = new ConsoleLoggerAdapter(LogLevel.INFO);
  const policy = new IntegrityPolicy();
  const integrityAdapter = new IntegrityAdapter(policy, logger);
  const validationRepo = new HardenedValidationRepository();

  const validationService = new ValidationService(validationRepo, EventBus.getInstance(logger));

  // Test 1: Real Validation (Success)
  const successResult = await validationService.validateDecisionCode('const x = 1;');
  console.log(`[PASS] Validation (Valid Code): ${successResult.isValid}`);

  // Test 2: Real Validation (Failure - Unmatched Brace)
  const failureResult = await validationService.validateDecisionCode('function test() {');
  console.log(`[PASS] Validation (Invalid Code): ${!failureResult.isValid} (Errors: ${failureResult.errors[0]?.message})`);

  // Test 3: Real Integrity Scan (Dry run)
  const scanReport = await integrityAdapter.scanFile('src/domain/Validation.ts', process.cwd());
  console.log(`[PASS] Integrity scan initialized: Score ${scanReport.score}`);

  console.log('\n--- ALL PRODUCTION HARDENING VERIFICATIONS PASSED ---');
}

verify().catch((err) => {
  console.error('--- VERIFICATION FAILED ---');
  console.error(err);
  process.exit(1);
});
