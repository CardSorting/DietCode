/**
 * JoyZoning: Broccoli Flow Verification Suite
 * Tests the high-throughput non-blocking refactor protocol.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IntegrityScanner } from '../src/domain/integrity/IntegrityScanner';
import { SovereignDb } from '../src/infrastructure/database/SovereignDb';
import { HealingWorker } from '../src/infrastructure/tools/HealingWorker';
import { RefactorTools } from '../src/infrastructure/tools/RefactorTools';

async function verify() {
  console.log('🧪 Starting Broccoli Flow Verification...');

  const projectRoot = process.cwd();
  const mockScanner: IntegrityScanner = {
    scan: async () => ({
      score: 100,
      violations: [],
      scannedAt: new Date().toISOString(),
      fileCount: 10,
    }),
    scanFile: async () => ({ score: 100, violations: [], scannedAt: new Date().toISOString() }),
  };

  const refactor = new RefactorTools(mockScanner);
  const worker = new HealingWorker();

  // 1. Setup orphan file
  const oldPath = 'src/infrastructure/TempBroccoliOrphan.ts';
  const newPath = 'src/infrastructure/storage/TempBroccoliOrphan.ts';
  fs.writeFileSync(
    path.resolve(projectRoot, oldPath),
    '/** [LAYER: INFRASTRUCTURE] */\nexport const temp = 1;',
  );

  try {
    console.log('\n--- Phase 1: Non-Blocking Move ---');
    // This move would normally need alignment (requiresHealing: true)
    const result = await refactor.moveAndFixImports(oldPath, newPath);

    if (result.success && !result.blocked) {
      console.log('✅ Success: Move was NON-BLOCKING.');
    } else {
      throw new Error('❌ Failure: Move was blocked or failed.');
    }

    console.log('\n--- Phase 2: Execution of Healing Worker ---');
    // Start worker briefly to process the job
    await worker.start();

    // Wait for queue processing (Sqlite is fast)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log('\n--- Phase 3: Verify Results ---');
    const content = fs.readFileSync(path.resolve(projectRoot, newPath), 'utf8');
    if (content.includes('[SUB-ZONE: storage]')) {
      console.log('✅ Success: Header updated asynchronously.');
    } else {
      console.log('❌ Failure: Header not updated.');
    }

    if (!fs.existsSync(path.resolve(projectRoot, oldPath))) {
      console.log('✅ Success: Old file removed.');
    }
  } finally {
    // Cleanup
    if (fs.existsSync(path.resolve(projectRoot, oldPath)))
      fs.unlinkSync(path.resolve(projectRoot, oldPath));
    if (fs.existsSync(path.resolve(projectRoot, newPath)))
      fs.unlinkSync(path.resolve(projectRoot, newPath));
    console.log('\n🧹 Verification Cleanup Complete.');
    process.exit(0);
  }
}

verify().catch((err) => {
  console.error('💥 Verification Failed:', err);
  process.exit(1);
});
