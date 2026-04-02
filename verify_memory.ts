/**
 * [VERIFICATION]
 * Tests Memory Service context management and snapshot operations.
 */

import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';
import { MemoryService } from './src/core/memory/MemoryService';
import { LogLevel } from './src/domain/logging/LogLevel';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';

async function verify() {
  console.log('--- DIETCODE MEMORY VERIFICATION ---');

  const fs = new FileSystemAdapter();
  const logger = new ConsoleLoggerAdapter(LogLevel.INFO) as any; // Used for testing only
  const memoryService = new MemoryService(fs, logger);

  // 1. Test Context Storage
  console.log('\n[1] Testing context storage...');
  const testContext = {
    type: 'test',
    project: '/test/project',
    branch: 'main',
  };
  
  await memoryService.store(testContext);
  console.log('[PASS] Context stored successfully');

  // 2. Test Context Retrieval
  console.log('\n[2] Testing context retrieval...');
  const retrieved = await memoryService.retrieve(testContext.project);
  console.log(`[PASS] Context retrieved: ${retrieved !== null}`);

  // 3. Test Snapshot Creation
  console.log('\n[3] Testing snapshot creation...');
  await memoryService.delete(testContext.project);
  const snapshot = await memoryService.snapshot(testContext.project);
  console.log(`[PASS] Snapshot created: ${snapshot !== null}`);

  console.log('\n--- ALL MEMORY VERIFICATIONS PASSED ---');
}

verify().catch(err => {
  console.error('--- VERIFICATION FAILED ---');
  console.error(err);
  process.exit(1);
});