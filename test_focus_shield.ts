/**
 * [TEST] 🛡️ Focus Shield (Context Lockdown) Verification
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { FocusShield } from './src/core/task/FocusShield';
import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';

async function testFocusShield() {
  console.log('🛡️ Starting Focus Shield Protocol Verification...');

  const adapter = new FileSystemAdapter();
  const shield = FocusShield.getInstance();

  const testFileAllowed = path.resolve(process.cwd(), 'allowed_file.ts');
  const testFileBlocked = path.resolve(process.cwd(), 'blocked_file.ts');

  fs.writeFileSync(testFileAllowed, '// [LAYER: CORE]\nexport const allowed = 1;');
  fs.writeFileSync(testFileBlocked, '// [LAYER: CORE]\nexport const blocked = 1;');

  try {
    // 1. Before activation, everything should be allowed
    console.log('[1] Verifying access before shield activation...');
    adapter.readFile(testFileBlocked);
    console.log('✅ Access allowed (Inactive): PASS');

    // 2. Activate shield with only the allowed file
    console.log('\n[2] Activating Focus Shield with "allowed_file.ts"...');
    shield.activate([testFileAllowed]);

    // 3. Test allowed access
    console.log('[3] Verifying access to allowed file...');
    const content = adapter.readFile(testFileAllowed);
    if (!content) throw new Error('Failed to read allowed file');
    console.log('✅ Access allowed (Active): PASS');

    // 4. Test blocked access
    console.log('\n[4] Verifying access to blocked file (Expect Violation)...');
    try {
      adapter.readFile(testFileBlocked);
      throw new Error('❌ FocusShield ERROR: Blocked file was accessed!');
    } catch (err: any) {
      if (err.message.includes('Sovereign Scope Violation')) {
        console.log('✅ Access blocked: PASS');
      } else {
        throw err;
      }
    }

    // 5. Deactivate shield
    console.log('\n[5] Deactivating Focus Shield...');
    shield.deactivate();
    adapter.readFile(testFileBlocked);
    console.log('✅ Access restored: PASS');
  } finally {
    // Cleanup
    try {
      fs.unlinkSync(testFileAllowed);
    } catch (e) {}
    try {
      fs.unlinkSync(testFileBlocked);
    } catch (e) {}
  }

  console.log('\n✨ FOCUS SHIELD PROTOCOL VERIFIED ✨');
}

testFocusShield().catch((err) => {
  console.error('\n❌ FOCUS SHIELD VERIFICATION FAILED');
  console.error(err);
  process.exit(1);
});
