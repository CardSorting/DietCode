/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [VERIFICATION: INFRASTRUCTURE HARDENING]
 * Checks PathValidator, FileSystem hardening, Governance, and Sovereign Doctor.
 */

import * as path from 'node:path';
import { GovernanceAction, ResourceGovernor } from './src/core/capabilities/ResourceGovernor';
import { SovereignDoctor } from './src/core/integrity/SovereignDoctor';
import { EventBus } from './src/core/orchestration/EventBus';
import { EventType } from './src/domain/Event';
import { EnhancedFileSystemAdapter } from './src/infrastructure/EnhancedFileSystemAdapter';
import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';
import { PathValidator } from './src/infrastructure/validation/PathValidator';

async function verify() {
  console.log('--- DIETCODE INFRASTRUCTURE HARDENING VERIFICATION ---');

  const workspaceRoot = process.cwd();
  const validator = new PathValidator(workspaceRoot);
  const fs = new FileSystemAdapter(validator);
  const enhancedFs = new EnhancedFileSystemAdapter(validator);
  const eventBus = EventBus.getInstance();

  let passed = true;

  // 1. Path Traversal & Security
  console.log('\n[PHASE 1] Testing Path Security...');
  const traversalPath = '../secret.txt';
  try {
    fs.readFile(traversalPath);
    console.error('❌ FAIL: FileSystemAdapter allowed traversal');
    passed = false;
  } catch (e: any) {
    console.log(`✅ PASS: FileSystemAdapter blocked traversal: ${e.message}`);
  }

  const shellPath = 'file.txt; rm -rf /';
  try {
    fs.exists(shellPath);
    console.error('❌ FAIL: FileSystemAdapter allowed shell injection');
    passed = false;
  } catch (e: any) {
    console.log(`✅ PASS: FileSystemAdapter blocked shell injection: ${e.message}`);
  }

  // 2. Resource Governance
  console.log('\n[PHASE 2] Testing Resource Governance...');
  const governor = new ResourceGovernor({ maxToolCalls: 2 });
  governor.recordInvocation('test');
  governor.recordResult('test', true, 10);
  governor.recordInvocation('test');
  governor.recordResult('test', true, 10);

  const govResult = governor.shouldProceed('test');
  if (govResult.action === GovernanceAction.BLOCK) {
    console.log(`✅ PASS: ResourceGovernor blocked calls exceeding limit: ${govResult.reason}`);
  } else {
    console.error('❌ FAIL: ResourceGovernor allowed calls exceeding limit');
    passed = false;
  }

  // 3. Sovereign Doctor
  console.log('\n[PHASE 3] Testing Sovereign Doctor...');
  const doctor = new SovereignDoctor(fs, workspaceRoot);
  const health = await doctor.diagnose();
  if (health.healthy) {
    console.log('✅ PASS: SovereignDoctor reports healthy system');
  } else {
    console.log(`ℹ️  System Info: ${health.issues.length} issues detected`);
    for (const issue of health.issues) {
      console.log(`   - [${issue.severity}] ${issue.component}: ${issue.message}`);
    }
  }

  if (passed) {
    console.log('\n✨ ALL HARDENING VERIFICATIONS PASSED! ✨');
    process.exit(0);
  } else {
    console.log('\n❌ HARDENING VERIFICATIONS FAILED! ❌');
    process.exit(1);
  }
}

verify().catch((err) => {
  console.error('💥 VERIFICATION CRASHED:', err);
  process.exit(1);
});
