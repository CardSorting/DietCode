/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: UTILS]
 * Principle: Architectural Observability — generates the JoyMap and Health Score.
 * Pass 7: Distributed Architectural Auditing.
 */

import * as path from 'node:path';
import { LogLevel } from './src/domain/logging/LogLevel';
import { ViolationType } from './src/domain/memory/Integrity';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';
import { WorkerIntegrityAdapter } from './src/infrastructure/WorkerIntegrityAdapter';

async function runDeepAudit() {
  console.log('🌸 [JoyFull] Starting Distributed Architectural Audit (Worker-Throttled)...');

  const projectRoot = process.cwd();
  const logger = new ConsoleLoggerAdapter(LogLevel.INFO);
  const workerScanner = new WorkerIntegrityAdapter(logger);

  const startTime = Date.now();
  // Pass 7: Background worker scan
  const report = await workerScanner.scan(projectRoot);
  const duration = Date.now() - startTime;

  console.log('\n📊 [ARCHITECTURAL HEALTH INDEX]');
  console.log('-----------------------------');
  console.log(`Score:       ${report.score}/100`);
  console.log(`Files:       ${report.fileCount || 'Batch Scan'}`);
  console.log(`Violations:  ${report.violations.length}`);
  console.log(`Audit Time:  ${duration}ms (Off-Thread)`);
  console.log('-----------------------------');

  if (report.violations.length > 0) {
    console.log('\n🚨 DETECTED VIOLATIONS:');
    report.violations.forEach((v) => {
      const icon = v.severity === 'error' ? '❌' : '⚠️';
      console.log(`${icon} [${v.type.toUpperCase()}] ${v.file}: ${v.message}`);
    });
  } else {
    console.log('\n✨ CODEBASE PURITY ACHIEVED: Zero architectural violations detected.');
  }

  // Generate Mermaid JoyMap
  console.log('\n🗺️  [JOYMAP] (Mermaid Graph):');
  console.log('```mermaid');
  console.log('graph TD');
  console.log('  subgraph "Domain Layer"');
  console.log('    Domain["[LAYER: DOMAIN]"]');
  console.log('  end');
  console.log('  subgraph "Core Layer"');
  console.log('    Core["[LAYER: CORE]"]');
  console.log('  end');
  console.log('  subgraph "Infrastructure Layer"');
  console.log('    Infra["[LAYER: INFRASTRUCTURE]"]');
  console.log('  end');
  console.log('  subgraph "UI Layer"');
  console.log('    UI["[LAYER: UI]"]');
  console.log('  end');

  console.log('  Core --> Domain');
  console.log('  Infra --> Domain');
  console.log('  Infra --> Core');
  console.log('  UI --> Domain');
  console.log('  UI --> Core');
  console.log('```');

  // Cleanup worker
  workerScanner.terminate();
}

runDeepAudit().catch((err) => {
  console.error('❌ Audit Failed:', err);
  process.exit(1);
});
