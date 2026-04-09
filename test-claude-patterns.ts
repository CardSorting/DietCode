/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * Test script to validate Claude Code Prompt pattern integration
 */

import { SafetyGuard } from './src/core/capabilities/SafetyGuard';
import { LogLevel } from './src/domain/logging/LogLevel';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';
import { ToolRouterAdapter } from './src/infrastructure/capabilities/ToolRouterAdapter';
import { PatternRepository } from './src/infrastructure/prompts/PatternRepository';
import { SafetyEvaluator } from './src/infrastructure/validation/SafetyEvaluator';

const logger = new ConsoleLoggerAdapter(LogLevel.INFO);

/**
 * Run all demonstrations
 */
async function runDemos() {
  console.log('\n🧪 Claude Code Prompts Pattern Integration Tests');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  // Demo 1: Safety Guard
  try {
    console.log('\n✓ Test 1: Safety Guard Integration');
    const evaluator = new SafetyEvaluator();
    const logger = new ConsoleLoggerAdapter(LogLevel.INFO);
    const guard = new SafetyGuard(evaluator, logger);

    // Use the evaluateToolSafety method from SafetyGuard
    const result = await guard.evaluateToolSafety('test_tool', { targetPath: '/test.ts' });

    if (result.isSafe !== undefined) {
      console.log('  ✅ PASSED: Safety guard executed successfully');
      console.log(`     - Risk Level: ${result.riskLevel}`);
      console.log(`     - Safe: ${result.isSafe}`);
      passed++;
    } else {
      console.log('  ❌ FAILED: Safety guard returned unexpected result');
      failed++;
    }
  } catch (error: any) {
    console.log(`  ❌ FAILED: ${error?.message || error}`);
    failed++;
  }

  // Demo 2: Pattern Repository
  try {
    console.log('\n✓ Test 2: Pattern Repository');
    const patterns = PatternRepository.getAllPatterns();
    if (patterns.length > 0) {
      console.log(`  ✅ PASSED: Found ${patterns.length} patterns`);
      passed++;
    } else {
      console.log('  ❌ FAILED: No patterns found');
      failed++;
    }
  } catch (error: any) {
    console.log(`  ❌ FAILED: ${error?.message || error}`);
    failed++;
  }

  // Demo 3: Tool Router
  try {
    console.log('\n✓ Test 3: Tool Router');
    const router = new ToolRouterAdapter([
      {
        id: 'test',
        name: 'test_tool',
        operationType: 'TEST',
        soloUseOnly: false,
        parallelizable: true,
        provenance: 'builtin',
      },
    ]);

    const route = await router.route({ operationType: 'TEST' });
    if (route.tool) {
      console.log('  ✅ PASSED: Tool routing works');
      passed++;
    } else {
      console.log('  ❌ FAILED: Tool routing failed');
      failed++;
    }
  } catch (error: any) {
    console.log(`  ❌ FAILED: ${error?.message || error}`);
    failed++;
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('✅ All Claude pattern integrations working correctly!');
  } else {
    console.log('⚠️  Some tests failed. Check the implementation.');
  }

  console.log(`${'='.repeat(60)}\n`);

  return failed === 0;
}

// Run tests
runDemos().then((success) => {
  process.exit(success ? 0 : 1);
});
