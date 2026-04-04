import * as fs from 'node:fs';
import * as path from 'node:path';
import { JobType } from '../src/domain/system/QueueProvider';
import { ConsoleLoggerAdapter } from '../src/infrastructure/ConsoleLoggerAdapter';
import { SovereignDb } from '../src/infrastructure/database/SovereignDb';
import { BroccoliQueueAdapter } from '../src/infrastructure/queue/BroccoliQueueAdapter';
import { SovereignWorkerProxy } from '../src/infrastructure/queue/SovereignWorkerProxy';

async function runBenchmark() {
  console.log('🚀 DIETCODE SCORING THROUGHPUT BENCHMARK (Phase 19) 🚀');
  console.log('======================================================\n');

  const dbPath = path.resolve(process.cwd(), 'data', 'benchmark-scoring.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  const logService = new ConsoleLoggerAdapter();
  await SovereignDb.init(dbPath);

  const queueAdapter = new BroccoliQueueAdapter();
  const proxy = new SovereignWorkerProxy(queueAdapter, logService);

  const testContent = `# Hardened Content for Benchmarking\n${'Line '.repeat(100)}`;
  const uniqueContent = (i: number) => `${testContent}\nUnique ID: ${i}`;

  console.log('📊 Phase 1: Tiered Cache Verification (20 repeated jobs)');
  const cacheStart = Date.now();
  const cachePromises = [];
  for (let i = 0; i < 20; i++) {
    cachePromises.push(
      proxy.executeSingle(JobType.SEMANTIC_SCORING, { content: testContent }, { priority: 1 }),
    );
  }
  await Promise.all(cachePromises);
  const cacheDuration = Date.now() - cacheStart;
  console.log(
    `✅ Cache Test: 20 jobs completed in ${cacheDuration}ms (Avg: ${cacheDuration / 20}ms)\n`,
  );

  console.log('📊 Phase 2: Parallel Throughput Verification (20 unique jobs)');
  const throughputStart = Date.now();
  const throughputPromises = [];
  for (let i = 0; i < 20; i++) {
    throughputPromises.push(
      proxy.executeSingle(JobType.SEMANTIC_SCORING, { content: uniqueContent(i) }, { priority: 0 }),
    );
  }
  await Promise.all(throughputPromises);
  const throughputDuration = Date.now() - throughputStart;
  console.log(
    `✅ Throughput Test: 20 unique jobs completed in ${throughputDuration}ms (Avg: ${throughputDuration / 20}ms)\n`,
  );

  console.log('📈 Benchmark Results Summary:');
  console.log(`   - Repeated Jobs (Cached): ${cacheDuration}ms`);
  console.log(`   - Unique Jobs (Computed): ${throughputDuration}ms`);
  console.log(
    `   - Cache Efficiency: ${(((throughputDuration - cacheDuration) / throughputDuration) * 100).toFixed(2)}% Improvement\n`,
  );

  if (cacheDuration < throughputDuration * 0.5) {
    console.log('🏆 HIGH THROUGHPUT HARDENING VERIFIED: [SUCCESS]');
  } else {
    console.log('⚠️  THROUGHPUT IMPROVEMENT SUB-OPTIMAL: [CHECK CACHE LOGIC]');
  }
}

runBenchmark().catch((err) => {
  console.error('❌ Benchmark failed:', err);
  process.exit(1);
});
