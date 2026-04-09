/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { JobType } from './src/domain/system/QueueProvider';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';
import { SovereignDb } from './src/infrastructure/database/SovereignDb';
import { BroccoliQueueAdapter } from './src/infrastructure/queue/BroccoliQueueAdapter';
import { SovereignWorkerProxy } from './src/infrastructure/queue/SovereignWorkerProxy';

async function verifyScoring() {
  console.log('🧪 Verifying Non-Blocking Scoring...');

  const dbPath = path.resolve(process.cwd(), 'data', 'test-scoring.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  const logService = new ConsoleLoggerAdapter();
  await SovereignDb.init(dbPath);

  const queueAdapter = new BroccoliQueueAdapter();
  const proxy = new SovereignWorkerProxy(queueAdapter, logService);

  console.log('✅ DB and Proxy Initialized.');

  const content = '# Test Content\n- [ ] Task 1\n- [ ] Task 2';

  console.log('📡 Enqueuing SEMANTIC_SCORING job...');
  const resultPromise = proxy.executeSingle<any, any>(
    JobType.SEMANTIC_SCORING,
    { content, tokenHashes: [] },
    { timeoutMs: 15000 },
  );

  console.log('⌛ Waiting for result (ensure worker is running)...');
  const result = await resultPromise;

  if (result.success) {
    console.log('🎉 SUCCESS: Received scoring results from worker!');
    console.log('📊 Result Payload:', JSON.stringify(result.payload, null, 2));
  } else {
    console.error('❌ FAILED: Did not receive results.', result.error);
    process.exit(1);
  }
}

verifyScoring().catch((err) => {
  console.error('💥 Error during verification:', err);
  process.exit(1);
});
