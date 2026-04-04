import * as path from 'node:path';
import { FileSystemAdapter } from '../../infrastructure/FileSystemAdapter';
import { PathValidator } from '../../infrastructure/validation/PathValidator';

async function testSandboxEscape() {
  console.log('🧪 Running Sandbox Escape Security Tests...');
  const workspaceRoot = process.cwd();
  const validator = new PathValidator(workspaceRoot);
  const fs = new FileSystemAdapter(validator);

  const attacks = [
    '../../etc/passwd',
    '~/.ssh/id_rsa',
    '/etc/hosts',
    'C:\\Windows\\System32\\drivers\\etc\\hosts',
    '..\\..\\..\\Windows\\System32\\cmd.exe',
    'subfolder/../../../secret.txt',
  ];

  for (const attack of attacks) {
    try {
      console.log(`Attack vector: ${attack}`);
      fs.readFile(attack);
      throw new Error(`❌ EXPLOIT SUCCESSFUL: Able to access ${attack}`);
    } catch (e: any) {
      if (e.message.indexOf('EXPLOIT SUCCESSFUL') !== -1) {
        process.exit(1);
      }
      console.log(`✅ EXPLOIT BLOCKED: ${e.message}`);
    }
  }

  console.log('\n✨ SANDBOX ESCAPE PROTECTION VERIFIED! ✨');
}

testSandboxEscape().catch((err) => {
  console.error('💥 Error during test:', err);
  process.exit(1);
});
