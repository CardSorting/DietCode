/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Strategic Quality Gate — production-grade architectural auditing.
 * Pass 15: JoyCheck CLI — enforces structural integrity thresholds.
 */

import * as path from 'node:path';
import { IntegrityService } from '../../core/integrity/IntegrityService';
import { IntegrityPolicy } from '../../domain/memory/IntegrityPolicy';
import { ConsoleLoggerAdapter } from '../ConsoleLoggerAdapter';
import { IntegrityAdapter } from '../IntegrityAdapter';

async function runAudit() {
  const projectRoot = process.cwd();
  const logger = new ConsoleLoggerAdapter();
  const policy = new IntegrityPolicy();
  const adapter = new IntegrityAdapter(policy, logger);
  const service = new IntegrityService(adapter);

  console.log('🛡️  JoyZoning Audit: Starting project-wide scan...');
  const startTime = Date.now();

  const report = await service.scan(projectRoot);
  const duration = Date.now() - startTime;

  console.log(`\n📊 Audit Results (Completed in ${duration}ms):`);
  console.log('-------------------------------------------');
  console.log(`Score:       ${report.score >= 90 ? '✅' : '❌'} ${report.score}/100`);
  console.log(`Files:       ${report.fileCount}`);
  console.log(`Violations:  ${report.violations.length}`);
  console.log('-------------------------------------------\n');

  if (report.violations.length > 0) {
    console.log('⚠️  Violations Detected:');
    report.violations.forEach((v, i) => {
      console.log(`${i + 1}. [${v.severity.toUpperCase()}] ${v.file}: ${v.message}`);
    });
  } else {
    console.log('✨ No architectural violations detected. Codebase is Joyfull.');
  }

  if (report.score < 90) {
    console.error('\n🚨 ARCHITECTURAL GATE FAILED: Health score is below the 90% threshold.');
    process.exit(1);
  }

  process.exit(0);
}

runAudit().catch((err) => {
  console.error('❌ Audit Failed Unexpectedly:', err);
  process.exit(1);
});
