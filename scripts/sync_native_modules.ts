import * as fs from 'node:fs';
import * as path from 'node:path';

const ABI_VERSION = '140';
const SOURCE_BINARY = 'node_modules/better-sqlite3/build/Release/better_sqlite3.node';
const TARGETS = [
  'build/Release/better_sqlite3.node',
];

console.log(`[SYNC] Starting native module synchronization for ABI ${ABI_VERSION}...`);

if (!fs.existsSync(SOURCE_BINARY)) {
  console.error(`[SYNC] ❌ Source binary not found: ${SOURCE_BINARY}`);
  process.exit(1);
}

for (const target of TARGETS) {
  const targetDir = path.dirname(target);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  console.log(`[SYNC] Copying to ${target}...`);
  fs.copyFileSync(SOURCE_BINARY, target);
}

console.log('[SYNC] ✅ Synchronization complete.');
