/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { fork } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AuditRecorder } from '../src/infrastructure/database/sovereign/AuditRecorder';
import { Core } from '../src/infrastructure/database/sovereign/Core';
import { Schema } from '../src/infrastructure/database/sovereign/Schema';

const __filename = fileURLToPath(import.meta.url);
const DB_PATH = path.resolve(process.cwd(), 'data', 'concurrency-test.db');

async function runChild() {
  try {
    await Core.init(DB_PATH, Schema.ensureSchema.bind(Schema));
    await AuditRecorder.recordAudit(
      'CONCURRENCY_TEST',
      `Process ${process.pid} initialized successfully`,
    );
    process.exit(0);
  } catch (err: any) {
    console.error(`Process ${process.pid} FAILED:`, err.message);
    process.exit(1);
  }
}

async function runMain() {
  console.log('🧪 MODULAR SQLITE CONCURRENCY TEST 🧪');
  console.log('====================================\n');

  if (!fs.existsSync(path.dirname(DB_PATH)))
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  const lockPath = `${DB_PATH}.lock`;
  if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);

  console.log(`Spawning 10 concurrent modular initialization processes using ${__filename}...`);

  const processes = [];
  for (let i = 0; i < 10; i++) {
    processes.push(
      new Promise((resolve, reject) => {
        const child = fork(__filename, ['child']);
        child.on('exit', (code) => {
          if (code === 0) resolve(true);
          else {
            console.error(`Child process ${i} exited with code ${code}`);
            reject(new Error(`Process exited with code ${code}`));
          }
        });
      }),
    );
  }

  try {
    await Promise.all(processes);
    console.log('\n✅ SUCCESS: All 10 modular processes initialized without error.');

    // Verify audit logs
    await Core.init(DB_PATH, Schema.ensureSchema.bind(Schema));
    const db = await Core.db();
    const logs = await (db as any)
      .selectFrom('audit_log' as any)
      .selectAll()
      .execute();
    console.log(`Verified ${logs.length} successful modular initialization markers in DB.`);
  } catch (err: any) {
    console.error('\n❌ FAILURE: Modular concurrency test failed.');
    console.error(err.message);
    process.exit(1);
  }
}

if (process.argv[2] === 'child') {
  runChild();
} else {
  runMain();
}
