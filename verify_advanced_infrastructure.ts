/**
 * [VERIFICATION: ADVANCED INFRASTRUCTURE]
 * Tests ExecutionGovernor, Capability Discovery, Persistent Locks, and Transactions.
 */

import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';
import { PathValidator } from './src/infrastructure/validation/PathValidator';
import { ExecutionGovernor } from './src/core/capabilities/ExecutionGovernor';
import { DiscoveryService } from './src/core/context/DiscoveryService';
import { NodeSystemAdapter } from './src/infrastructure/NodeSystemAdapter';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';
import { LogLevel } from './src/domain/logging/LogLevel';
import { defaultCapabilityRegistry } from './src/core/capabilities/CapabilityRegistry';
import { SqliteLockManager } from './src/infrastructure/database/SqliteLockManager';
import { LockOrchestrator } from './src/core/manager/LockOrchestrator';
import { TransactionManager } from './src/infrastructure/TransactionManager';
import { RollbackManager } from './src/infrastructure/validation/RollbackManager';
import * as path from 'path';

async function verify() {
  console.log('--- DIETCODE ADVANCED INFRASTRUCTURE VERIFICATION ---');
  
  const workspaceRoot = process.cwd();
  const validator = new PathValidator(workspaceRoot);
  const fs = new FileSystemAdapter(validator);
  const logger = new ConsoleLoggerAdapter(LogLevel.DEBUG);
  const systemAdapter = new NodeSystemAdapter(fs, logger);
  
  // Initialize Infrastructure
  await SqliteLockManager.initialize();
  
  const discovery = new DiscoveryService(fs, systemAdapter, logger);
  const rollback = new RollbackManager();
  const txManager = new TransactionManager(fs, rollback, logger);

  let passed = true;

  // 1. Resiliency (ExecutionGovernor)
  console.log('\n[PHASE 5] Testing ExecutionGovernor (Resiliency)...');
  const execGov = new ExecutionGovernor();
  let callCount = 0;
  try {
    await execGov.execute('test-retry', async () => {
      callCount++;
      if (callCount < 3) throw new Error('SQLITE_BUSY');
      return 'SUCCESS';
    }, { maxRetries: 3, backoffMs: 10 });
    
    if (callCount === 3) {
      console.log('✅ PASS: ExecutionGovernor retried on SQLITE_BUSY');
    } else {
      console.error(`❌ FAIL: ExecutionGovernor expected 3 calls, got ${callCount}`);
      passed = false;
    }
  } catch (e: any) {
    console.error(`❌ FAIL: ExecutionGovernor should not have thrown: ${e.message}`);
    passed = false;
  }

  // 2. Capability Discovery
  console.log('\n[PHASE 6] Testing DiscoveryService (Capabilities)...');
  await discovery.discover(workspaceRoot);
  const gitCap = defaultCapabilityRegistry.get('git');
  if (gitCap && gitCap.available) {
    console.log(`✅ PASS: git discovered (${gitCap.version})`);
  } else {
    console.error('❌ FAIL: git was not discovered');
    passed = false;
  }

  // 3. Persistent Locks (LockOrchestrator)
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
  // Commit it
  await txManager.commit();
  
  txManager.startTransaction();
  await txManager.stageWrite(testFile, 'updated');
  // Pretend failure and rollback
  await txManager.rollback();
  
  const currentContent = fs.readFile(testFile);
  if (currentContent === 'initial') {
    console.log('✅ PASS: Transaction rolled back to initial state');
  } else {
    console.error(`❌ FAIL: Transaction rollback failed, got: ${currentContent}`);
    passed = false;
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

verify().catch(err => {
  console.error('💥 VERIFICATION CRASHED:', err);
  process.exit(1);
});
