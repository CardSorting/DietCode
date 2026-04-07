/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { SemanticIntegrityAdapter } from './src/infrastructure/SemanticIntegrityAdapter';
import { SovereignDb } from './src/infrastructure/database/SovereignDb';
import { RefactorTools } from './src/infrastructure/tools/RefactorTools';

async function verify() {
  console.log('--- STARTING JOYZONING VERIFICATION ---');

  // We need a real scanner or a mock one.
  // Let's see what scanner are available.
  // SemanticIntegrityAdapter is often used.

  const scanner = {
    scan: async () => ({ score: 100, violations: [] }),
  } as any;

  const tools = new RefactorTools(scanner);

  // Attempt move of JOY_ZONING_GUIDE.md
  // We simulate a DOMAIN_LEAK by manual path check if we were using real simulator
  // But RefactorTools calls JoySimulator, which calls ArchitecturalGuardian.

  const oldPath = 'INFRASTRUCTURE/JOY_ZONING_GUIDE.md';
  const newPath = 'src/domain/JOY_ZONING_GUIDE.md'; // This is a DOMAIN_LEAK

  console.log(`[Test] Moving ${oldPath} to ${newPath}...`);

  const result = await tools.moveAndFixImports(oldPath, newPath);

  console.log('Result:', JSON.stringify(result, null, 2));

  if (result.success && !result.blocked) {
    console.log('✅ Success: First pass was bypassed.');
  } else {
    console.log('❌ Failure: First pass was blocked.');
  }

  // Check queue
  const queue = await SovereignDb.getQueue();
  // Assuming we can check the queue or just logs
  console.log('--- VERIFICATION COMPLETE ---');
}

// verify(); // Commented out so it doesn't run during write
