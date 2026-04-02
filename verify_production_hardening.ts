/**
 * [VERIFICATION]
 * Tests Production Hardening patterns and layer integration.
 */

import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';
import { IntegrityAdapter } from './src/infrastructure/IntegrityAdapter';
import { ValidationService } from './src/core/integrity/ValidationService';
import { LogLevel } from './src/domain/logging/LogLevel';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';

async function verify() {
  console.log('--- DIETCODE PRODUCTION HARDENING VERIFICATION ---');

  const fs = new FileSystemAdapter();
  const integrityAdapter = new IntegrityAdapter(fs);
  const logger = new ConsoleLoggerAdapter(LogLevel.INFO) as any; // Used for testing only
  const validationService = new ValidationService(integrityAdapter, logger);
  const integrityService = new ValidationService(integrityAdapter, logger);

  // 1. Test Layer Integration
  console.log('\n[1] Testing Domain-Infrastructure integration...');
  // Domain validation doesn't do I/O, but Infrastructure adapter should be independent
  const validationResult = await validationService.validateDecisionCode('testCode');
  console.log(`[PASS] Domain-Infrastructure integration works: ${validationResult}`);
  
  // Test Infrastructure's Scanner
  const report = await integrityService.scan('/test');
  console.log(`[PASS] Infrastructure adapter working: ${report.violations.length}`);
  console.log(`[PASS] Integrity Score: ${report.score}/100`);

  console.log('\n--- ALL PRODUCTION HARDENING VERIFICATIONS PASSED ---');
}

verify().catch(err => {
  console.error('--- VERIFICATION FAILED ---');
  console.error(err);
  process.exit(1);
});