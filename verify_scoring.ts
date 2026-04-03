import { SovereignDb } from './src/infrastructure/database/SovereignDb';
import { SovereignWorkerProxy } from './src/infrastructure/queue/SovereignWorkerProxy';
import { BroccoliQueueAdapter } from './src/infrastructure/queue/BroccoliQueueAdapter';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';
import { JobType } from './src/domain/system/QueueProvider';
import * as path from 'path';
import * as fs from 'fs';

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
        { timeoutMs: 15000 }
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

verifyScoring().catch(err => {
    console.error('💥 Error during verification:', err);
    process.exit(1);
});
