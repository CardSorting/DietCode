import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SovereignIntegrityManager } from './src/domain/integrity/SovereignIntegrityManager';
import { IntegrityPolicy } from './src/domain/memory/IntegrityPolicy';
import { JobType } from './src/domain/system/QueueProvider';
import { SovereignDb } from './src/infrastructure/database/SovereignDb';
import { QueueWorker } from './src/infrastructure/queue/QueueWorker';

async function test() {
  console.log('--- Deep Sovereignty Verification (v7) ---');

  const logService: any = {
    info: (msg: string, meta: any) => console.log(`[INFO] ${msg}`, meta || ''),
    error: (msg: string, meta: any) => console.error(`[ERROR] ${msg}`, meta || ''),
    warn: (msg: string, meta: any) => console.warn(`[WARN] ${msg}`, meta || ''),
    debug: (msg: string, meta: any) => console.debug(`[DEBUG] ${msg}`, meta || ''),
  };

  console.log('1. Initializing DB...');
  await SovereignDb.init();

  console.log('2. Starting Queue Worker...');
  const worker = new QueueWorker(
    {} as any, // decisions
    {} as any, // memory
    {} as any, // healing
    { getAgent: () => null } as any, // registry
    {} as any, // provider
    logService,
  );
  await worker.start();

  console.log('3. Preparing Unified Scan...');
  const queue = await SovereignDb.getQueue();
  const manager = new SovereignIntegrityManager(queue);

  const projectRoot = process.cwd();
  const files = getAllTsFiles(path.join(projectRoot, 'src')).map((f) =>
    path.relative(projectRoot, f),
  );

  const taskId = crypto.randomUUID();
  console.log(`Task ID: ${taskId} (${files.length} files)`);

  // Create task entry
  const db = await SovereignDb.db();
  await db
    .insertInto('sovereign_tasks' as any)
    .values({
      id: taskId,
      type: 'UNIFIED_SCAN',
      status: 'running',
      total_shards: files.length, // Let's say 1 shard per file for semantic
      completed_shards: 0,
      created_at: Date.now(),
      updated_at: Date.now(),
    })
    .execute();

  console.log('4. Initiating Scan...');
  await manager.initiateUnifiedScan(taskId, files, {
    projectRoot,
    useSemantic: true,
    useStructure: true,
  });

  console.log('5. Waiting for results (Aggregating from job_results)...');
  const start = Date.now();
  const timeout = 120000;

  while (Date.now() - start < timeout) {
    const resultsCount = (await db
      .selectFrom('job_results' as any)
      .select(({ fn }) => [fn.count<number>('id').as('count')])
      .where('taskId', '=', taskId)
      .executeTakeFirst()) as any;

    process.stdout.write(`\rProgress: ${resultsCount.count}/${files.length} shards completed...`);

    if (resultsCount.count >= files.length) {
      console.log('\nAll shards complete!');
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const jobResults = (await db
    .selectFrom('job_results' as any)
    .selectAll()
    .where('taskId', '=', taskId)
    .execute()) as any[];

  const reports = jobResults.map((r) => JSON.parse(r.payload));
  const finalReport = manager.aggregateResults(reports, files.length);

  console.log(`\nFinal Score: ${finalReport.score}`);
  console.log(`Total Violations: ${finalReport.violations.length}`);

  if (finalReport.violations.length > 0) {
    console.log('\nTop 5 Violations:');
    console.table(
      finalReport.violations.slice(0, 5).map((v) => ({
        Type: v.type,
        File: v.file,
        Message: v.message.length > 80 ? `${v.message.slice(0, 77)}...` : v.message,
      })),
    );
  }

  process.exit(0);
}

function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      if (!name.includes('node_modules') && !name.includes('.git')) {
        getAllTsFiles(name, fileList);
      }
    } else if (name.endsWith('.ts')) {
      fileList.push(name);
    }
  }
  return fileList;
}

test().catch((err) => {
  console.error(err);
  process.exit(1);
});
