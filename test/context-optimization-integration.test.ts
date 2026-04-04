/**
 * Context Optimization Integration Test
 * Demonstrates how to use the complete context optimization system
 */

import { SnapshotService } from '../src/core/memory/SnapshotService';
import {
  ContextOptimizationServiceOrchestrator,
  createDefaultOrchestrator,
} from '../src/core/orchestration/ContextOptimizationService';
import { ExecutionService } from '../src/core/orchestration/ExecutionService';
import { EnhancedFileSystemAdapter } from '../src/infrastructure/EnhancedFileSystemAdapter';
import { SignatureDatabase } from '../src/infrastructure/context/SignatureDatabase';
import { SovereignDb } from '../src/infrastructure/database/SovereignDb';
import { SqliteSnapshotRepository } from '../src/infrastructure/database/SqliteSnapshotRepository';

async function runIntegrationTest() {
  console.log('🧪 Starting Context Optimization Integration Test...\n');

  // Step 1: Setup
  console.log('📦 Step 1: Setup');

  // Initialize DB for integration test
  await SovereignDb.init(':memory:');

  // Create a signature database
  const signatureDb = new SignatureDatabase();

  // Create the orchestrator with custom config
  const orchestrator = createDefaultOrchestrator(signatureDb);

  // Create execution service with snapshots
  const repository = new SqliteSnapshotRepository();
  const fs = new EnhancedFileSystemAdapter();
  const snapshotService = new SnapshotService(repository, fs);
  const executionService = new ExecutionService(snapshotService);

  // Enable context optimization in execution service
  executionService.enableContextOptimization(orchestrator);

  console.log('✅ Setup complete\n');

  // Step 2: Start session
  console.log('📊 Step 2: Start optimization session');
  const sessionId = `session-${Date.now()}`;
  executionService.startOptimizationSession(sessionId);
  console.log('✅ Session started\n');

  // Step 3: Read files with optimization
  console.log('📖 Step 3: Read files with optimization');
  const testFiles = ['/path/to/file1.ts', '/path/to/file2.ts', '/path/to/file3.ts'];

  for (let i = 0; i < 5; i++) {
    console.log(`\n--- Read iteration ${i + 1} ---`);

    for (const filePath of testFiles) {
      const result = await executionService.readFileOptimized(filePath);

      console.log(`  File: ${filePath}`);
      console.log(`  Optimized: ${result.wasOptimized}`);
      console.log(`  Checksum: ${result.content.substring(0, 50)}...`);
      console.log(
        `  Size: ${result.originalLength} → ${result.optimizedLength} (${result.wasOptimized ? 'TRUNCATED' : 'FULL'})`,
      );
    }

    // Wait a bit to simulate real-world delay
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  console.log('\n✅ File reading complete\n');

  // Step 4: Check context summary
  console.log('📈 Step 4: Check context summary');
  const summary = executionService.getContextSummary();
  if (summary) {
    console.log('Context summary:');
    console.log(`  Total reads: ${summary.totalReads}`);
    console.log(`  Optimized files: ${summary.optimizedFiles}`);
    console.log(`  Potential savings: ${summary.potentialSavings.toFixed(1)}%`);
    console.log(`  Context saturation: ${(summary.saturation * 100).toFixed(0)}%`);
  }
  console.log();

  // Step 5: Generate report
  console.log('📊 Step 5: Generate optimization report');
  const report = await executionService.endOptimizationSession();

  if (report) {
    console.log('\nOptimization Report:');
    console.log(`  Score: ${report.metrics.optimizationScore.toFixed(1)}/100`);
    console.log(`  Savings: ${report.metrics.percentageSaved.toFixed(1)}%`);
    console.log(`  Total bytes saved: ${(report.metrics.bytesSavedKB).toFixed(2)} KB`);
    console.log(`  Total signatures: ${report.signatureCount}`);
    console.log(`  Context truncated: ${report.contextTruncated}`);
    console.log();

    console.log('Recommendations:');
    report.recommendations.slice(0, 3).forEach((rec: string) => {
      console.log(`  - ${rec}`);
    });
  }

  // Step 6: Check diagnostics
  console.log('\n🔧 Step 6: Check diagnostics');
  const diagnostics = executionService.getConsolidatedDiagnostics();
  console.log('Diagnostics:');
  console.log(`  Safety integration: ${diagnostics.safetyIntegration}`);
  console.log(`  Context optimization: ${diagnostics.contextOptimization.enabled}`);
  console.log(`  Fully integrated: ${diagnostics.systemStatus.fullyIntegrated}`);
  console.log();

  console.log('✅ Integration test complete!\n');
}

// Run the test
runIntegrationTest()
  .catch(console.error)
  .finally(() => console.log('Test execution finished'));
