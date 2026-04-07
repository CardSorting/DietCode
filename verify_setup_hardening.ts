import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';
import { SovereignDb } from './src/infrastructure/database/SovereignDb';
import * as fs from 'node:fs';

async function test() {
    await SovereignDb.init('./data/test-hardening.db');
    const adapter = new FileSystemAdapter();
    const testFile = './test-permissions.txt';
    const content = 'secret data';
    
    // Test permission writing (0o600 is 384 in decimal)
    adapter.writeFile(testFile, content, { mode: 0o600 });
    
    const stats = fs.statSync(testFile);
    const mode = stats.mode & 0o777;
    
    console.log(`File mode: 0o${mode.toString(8)}`);
    
    if (process.platform !== 'win32') {
        if (mode === 0o600) {
            console.log('SUCCESS: File permissions hardened to 0o600.');
        } else {
            console.log(`FAILURE: File permissions are 0o${mode.toString(8)}, expected 0o600.`);
            process.exit(1);
        }
    } else {
        console.log('Skipping Unix permission check on Windows.');
    }
    
    // Cleanup
    fs.unlinkSync(testFile);
    console.log('Verification completed.');
}

test().catch(console.error);
