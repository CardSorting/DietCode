/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [VERIFICATION]
 * Tests Triple Down features: Integrity Guard, Ignore Processing, and Context Pruning.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ContextPruner } from './src/core/context/ContextPruner';
import { Ignorer } from './src/core/context/Ignorer';
import { IntegrityService } from './src/core/integrity/IntegrityService';
import { LogLevel } from './src/domain/logging/LogLevel';
import type { LogService } from './src/domain/logging/LogService';
import { IntegrityPolicy } from './src/domain/memory/IntegrityPolicy';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';
import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';
import { IntegrityAdapter } from './src/infrastructure/IntegrityAdapter';

async function verify() {
  console.log('--- DIETCODE TRIPLE DOWN VERIFICATION ---');

  const fileSystem = new FileSystemAdapter();
  const root = process.cwd();

  // 1. Test Ignore Logic
  console.log('\n[1] Testing Ignorer...');
  const logger = new ConsoleLoggerAdapter(LogLevel.INFO) as LogService;
  const ignorer = new Ignorer(fileSystem, root, logger);
  const gitIgnored = ignorer.isIgnored('.git/config');
  const nodeIgnored = ignorer.isIgnored('node_modules/bun/index.js');
  const srcNotIgnored = !ignorer.isIgnored('src/core/orchestrator.ts');

  console.log(`[PASS] .git ignored: ${gitIgnored}`);
  console.log(`[PASS] node_modules ignored: ${nodeIgnored}`);
  console.log(`[PASS] src/core not ignored: ${srcNotIgnored}`);

  if (!gitIgnored || !nodeIgnored || !srcNotIgnored) {
    throw new Error('Ignorer logic failure.');
  }

  // 2. Test Integrity Guard
  console.log('\n[2] Testing Integrity Guard...');
  const policy = new IntegrityPolicy();
  const integrityAdapter = new IntegrityAdapter(policy, logger);
  const integrityService = new IntegrityService(integrityAdapter, undefined, logger);

  // Create a deliberate violation in a temp file
  const violationFile = path.join(root, 'src', 'domain', 'Violation.ts');
  fs.writeFileSync(violationFile, 'import * as fs from "fs";\nexport const x = 1;');

  const report = await integrityService.scan(root);
  const violationFound = report.violations.some((v: any) => v.file.includes('Violation.ts'));

  console.log(`[PASS] Integrity Score: ${report.score}/100`);
  console.log(`[PASS] Violation detected in domain: ${violationFound}`);

  // Cleanup violation
  fs.unlinkSync(violationFile);

  if (!violationFound) {
    throw new Error('Integrity Guard failed to detect I/O in domain.');
  }

  // 3. Test Context Pruning
  console.log('\n[3] Testing Context Pruner...');
  const pruner = new ContextPruner();
  const largeContent = Array.from({ length: 200 }, (_, i) => `Line ${i + 1}`).join('\n');
  const attachment = {
    path: 'large_file.txt',
    content: { type: 'file_content', content: largeContent, info: { path: 'large_file.txt' } },
  } as any;

  const prunedArray = pruner.prune([attachment]);
  const pruned = prunedArray[0]!;
  const isPruned = (pruned.content as any).content.includes('FOLDED');

  console.log(`[PASS] Large file pruned/folded: ${isPruned}`);
  console.log(`[PASS] Original Line Count: ${(pruned.content as any).info.originalLineCount}`);

  if (!isPruned) {
    throw new Error('Context Pruner failed to fold large content.');
  }

  console.log('\n--- ALL TRIPLE DOWN VERIFICATIONS PASSED ---');
}

verify().catch((err) => {
  console.error('\n--- VERIFICATION FAILED ---');
  console.error(err);
  process.exit(1);
});
