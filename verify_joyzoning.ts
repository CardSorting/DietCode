/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: UTILS]
 * JoyZoning Enforcement Script
 *
 * Usage: bun run verify_joyzoning.ts [path/to/file.ts]
 * If no path is provided, scans the entire project.
 */

import * as path from 'node:path';
import { IntegrityService } from './src/core/integrity/IntegrityService';
import { LogLevel } from './src/domain/logging/LogLevel';
import { IntegrityPolicy } from './src/domain/memory/IntegrityPolicy';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';
import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';
import { IntegrityAdapter } from './src/infrastructure/IntegrityAdapter';

async function main() {
  const logger = new ConsoleLoggerAdapter();
  logger.setMinLevel(LogLevel.INFO);
  const policy = new IntegrityPolicy();
  const integrityAdapter = new IntegrityAdapter(policy, logger);
  const integrityService = new IntegrityService(integrityAdapter, undefined, logger);

  const projectRoot = process.cwd();
  const targetFile = process.argv[2];

  if (targetFile) {
    console.log(`\n🔍 Verifying JoyZoning for: ${targetFile}`);
    const report = await integrityService.scan(projectRoot);
    const fileViolations = report.violations.filter(
      (v) => v.file === targetFile || path.join(projectRoot, v.file) === path.resolve(targetFile),
    );

    if (fileViolations.length === 0) {
      console.log('✅ JoyZoning Verified: No architectural violations found.');
    } else {
      console.log(`❌ Found ${fileViolations.length} architectural violations:`);
      for (const v of fileViolations) {
        console.log(`  - [${v.type}] ${v.message} (${v.severity})`);
      }
      process.exit(1);
    }
  } else {
    console.log('\n🔍 Scanning entire project for JoyZoning violations...');
    const report = await integrityService.scan(projectRoot);

    if (report.violations.length === 0) {
      console.log('✅ Project Health: No violations found.');
    } else {
      console.log(`⚠️  Project Health: Found ${report.violations.length} violations.`);
      for (const v of report.violations) {
        console.log(`  - [${v.file}] [${v.type}] ${v.message}`);
      }
      process.exit(1);
    }
  }
}

main().catch(console.error);
