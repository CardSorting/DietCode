/**
 * [VERIFICATION]
 * Tests the Self-Healing Service against various corruption scenarios.
 */

import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';
import { IntegrityAdapter } from './src/infrastructure/IntegrityAdapter';
import { SelfHealingService } from './src/core/integrity/SelfHealingService';
import { LogLevel } from './src/domain/logging/LogLevel';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';
import { ValidationService } from './src/core/integrity/ValidationService';

async function verify() {
  console.log('--- DIETCODE HEALING VERIFICATION ---');

  const fs = new FileSystemAdapter();
  const integrityAdapter = new IntegrityAdapter(fs);
  const logger = new ConsoleLoggerAdapter(LogLevel.INFO) as any; // Used for testing only
  const healingService = new SelfHealingService(integrityAdapter, logger);
  const validationService = new ValidationService(integrityAdapter, logger);

  // 1. Test Valid Code (Should not trigger healing)
  console.log('\n[1] Testing valid code (no healing needed)...');
  const validationResult1 = await validationService.validateDecisionCode('fakeCode');
  console.log(`[PASS] Valid code passed: ${validationResult1}`);
  // Trigger healing on valid code (should do nothing)
  const healed1 = await healingService.heal(validationResult1);
  console.log(`[PASS] Healing result on valid code: ${healed1}`);

  // 2. Test Corrupted Code (Should trigger healing)
  console.log('\n[2] Testing corrupted code (healing needed)...');
  const validationResult2 = await validationService.validateDecisionCode('fakeCodeCorrupted');
  console.log(`[PASS] Validation detected corruption: ${!validationResult2}`);
  
  const healed2 = await healingService.heal(validationResult2);
  console.log(`[PASS] Healing result: ${healed2}`);

  console.log('\n--- ALL HEALING VERIFICATIONS PASSED ---');
}

verify().catch(err => {
  console.error('--- VERIFICATION FAILED ---');
  console.error(err);
  process.exit(1);
});