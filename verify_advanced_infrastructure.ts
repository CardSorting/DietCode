/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [VERIFICATION: ADVANCED INFRASTRUCTURE]
 * Tests ExecutionGovernor, Capability Discovery, Persistent Locks, and Transactions.
 */

import * as path from 'node:path';
import { defaultCapabilityRegistry } from './src/core/capabilities/CapabilityRegistry';
import { ExecutionGovernor } from './src/core/capabilities/ExecutionGovernor';
import { DiscoveryService } from './src/core/context/DiscoveryService';
import { LockOrchestrator } from './src/core/manager/LockOrchestrator';
import { LogLevel } from './src/domain/logging/LogLevel';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';
import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';
import { NodeSystemAdapter } from './src/infrastructure/NodeSystemAdapter';
import { TransactionManager } from './src/infrastructure/TransactionManager';
import { LockManager } from './src/infrastructure/database/sovereign/LockManager';
import { PathValidator } from './src/infrastructure/validation/PathValidator';
import { RollbackManager } from './src/infrastructure/validation/RollbackManager';
import { Core } from './src/infrastructure/database/sovereign/Core';
import { Schema } from './src/infrastructure/database/sovereign/Schema';

async function verify() {
  console.log('--- DIETCODE ADVANCED INFRASTRUCTURE VERIFICATION ---');

  const workspaceRoot = process.cwd();
  const validator = new PathValidator(workspaceRoot);
  const fs = new FileSystemAdapter(validator);
  const logger = new ConsoleLoggerAdapter(LogLevel.DEBUG);
  const systemAdapter = new NodeSystemAdapter(fs, logger);

  // Initialize Core for database-dependent tests
  const dbPath = path.join(workspaceRoot, '.dietcode', 'verify_test.db');
  await Core.init(dbPath);
  await Schema.ensureSchema(Core.pool);

  // Initialize Infrastructure
  const discovery = new DiscoveryService(fs, systemAdapter, logger);
  const rollback = new RollbackManager();
  const txManager = new TransactionManager(fs, rollback, logger);

  let passed = true;

  // ... [PHASES 5-7 skipped for brevity, but they stay in the file] ...
  // [PHASE 5] Testing ExecutionGovernor (Resiliency)...
  console.log('\n[PHASE 5] Testing ExecutionGovernor (Resiliency)...');
  const execGov = new ExecutionGovernor();
  let callCount = 0;
  try {
    await execGov.execute({
      task: {
        id: 'test-retry',
        execute: async () => {
          callCount++;
          if (callCount < 3) throw new Error('SQLITE_BUSY');
          return 'SUCCESS';
        },
      },
    });

    if (callCount === 3) {
      console.log('✅ PASS: ExecutionGovernor retried on SQLITE_BUSY');
    } else {
      console.error(`❌ FAIL: ExecutionGovernor expected 3 calls, got ${callCount}`);
      passed = false;
    }
  } catch (e: unknown) {
    const error = e as Error;
    console.error(`❌ FAIL: ExecutionGovernor should not have thrown: ${error.message}`);
    passed = false;
  }

  // [PHASE 6] Testing DiscoveryService (Capabilities)...
  console.log('\n[PHASE 6] Testing DiscoveryService (Capabilities)...');
  await discovery.discover(workspaceRoot);
  const gitCap = defaultCapabilityRegistry.get('git');
  if (gitCap?.available) {
    console.log(`✅ PASS: git discovered (${gitCap.metadata?.version})`);
  } else {
    console.error('❌ FAIL: git was not discovered');
    passed = false;
  }

  // [PHASE 7] Testing LockOrchestrator (Ownership)...
  console.log('\n[PHASE 7] Testing LockOrchestrator (Ownership)...');
  const lockGov = LockOrchestrator.getInstance();
  const scope = { taskId: 'test-task', operation: 'test-op', ownerId: 'agent-007' };
  const ticket = await lockGov.acquire(scope);
  if (ticket.ownerId === 'agent-007') {
    console.log(`✅ PASS: Lock acquired with ownerId: ${ticket.ownerId}`);
  } else {
    console.error(`❌ FAIL: Lock ticket ownerId mismatch: ${ticket.ownerId}`);
    passed = false;
  }
  await lockGov.release(ticket.resourceId, ticket.code);

  // 4. Transactions (TransactionManager)
  console.log('\n[PHASE 8] Testing TransactionManager (Atomicity)...');
  const testFile = path.join(workspaceRoot, 'tmp_tx_test.txt');
  txManager.startTransaction();
  await txManager.stageWrite(testFile, 'initial');
  await txManager.commit();

  txManager.startTransaction();
  await txManager.stageWrite(testFile, 'updated');
  await txManager.rollback();

  const currentContent = fs.readFile(testFile);
  if (currentContent === 'initial') {
    console.log('✅ PASS: Transaction rolled back to initial state (Restore)');
  } else {
    console.error(`❌ FAIL: Transaction rollback failed, got: ${currentContent}`);
    passed = false;
  }

  // 5. Orphan Cleanup (Harden Pass 19)
  console.log('\n[PHASE 9] Testing TransactionManager (Orphan Cleanup)...');
  const newFile = path.join(workspaceRoot, 'tmp_new_tx.txt');
  txManager.startTransaction();
  await txManager.stageWrite(newFile, 'new file content');
  await txManager.rollback();
  
  if (!fs.exists(newFile)) {
    console.log('✅ PASS: Orphan file purged on rollback');
  } else {
    console.error('❌ FAIL: Orphan file still exists on disk');
    passed = false;
    await fs.unlink(newFile); // Manual cleanup
  }

  // 6. Concurrency Protection
  console.log('\n[PHASE 10] Testing Infrastructure (Concurrency Guard)...');
  txManager.startTransaction();
  await txManager.stageWrite(testFile, 'locking test');
  
  // Try to acquire lock directly from LockManager - should fail as TX holds it
  try {
    const directScope = { taskId: 'other', operation: `file_write:${testFile}`, ownerId: 'intruder' };
    const res = await LockManager.getInstance().acquire(directScope, 0);
    if (!res.success) {
      console.log('✅ PASS: Distributed lock correctly prevents concurrent write');
    } else {
      console.error('❌ FAIL: Concurrent lock acquisition succeeded incorrectly');
      passed = false;
      await LockManager.getInstance().release(res.ticket!.resourceId, res.ticket!.code);
    }
  } finally {
    await txManager.rollback();
  }

  // Cleanup
  await fs.unlink(testFile);

  if (passed) {
    console.log('\n✨ ALL ADVANCED INFRASTRUCTURE VERIFICATIONS PASSED! ✨');
    process.exit(0);
  } else {
    console.log('\n❌ ADVANCED INFRASTRUCTURE VERIFICATIONS FAILED! ❌');
    process.exit(1);
  }
}

verify().catch((err) => {
  console.error('💥 VERIFICATION CRASHED:', err);
  process.exit(1);
});
