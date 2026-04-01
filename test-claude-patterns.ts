/**
 * Test script to validate Claude Code Prompt pattern integration
 */

import { SafetyEvaluator, RollbackManager } from './src/infrastructure/validation/SafetyEvaluator';
import { SafetyGuard } from './src/core/capabilities/SafetyGuard';
import { PatternRepository } from './src/infrastructure/prompts/PatternRepository';
import { ToolRouterAdapter } from './src/infrastructure/capabilities/ToolRouterAdapter';

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
    const rollback = new RollbackManager();
    const eval = new SafetyEvaluator();
    const guard = new SafetyGuard(eval, rollback);
    
    const result = await guard.executeWithSafety(
      async () => ({ success: true }),
      'TEST_ACTION',
      { targetPath: '/test.ts' }
    );
    
    if (result && result.safety.success) {
      console.log('  ✅ PASSED: Safety guard executed successfully');
      passed++;
    } else {
      console.log('  ❌ FAILED: Safety guard returned unexpected result');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error}`);
    failed++;
  }
  
  // Demo 2: Pattern Repository
  try {
    console.log('\n✓ Test 2: Pattern Repository');
    const repo = new PatternRepository();
    
    const patterns = repo.getAllPatterns();
    if (patterns.length > 0) {
      console.log(`  ✅ PASSED: Found ${patterns.length} patterns`);
      passed++;
    } else {
      console.log('  ❌ FAILED: No patterns found');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error}`);
    failed++;
  }
  
  // Demo 3: Tool Router
  try {
    console.log('\n✓ Test 3: Tool Router');
    const router = new ToolRouterAdapter([
      { id: 'test', name: 'test_tool', operationType: 'TEST', soloUseOnly: false, parallelizable: true, provenance: 'builtin' }
    ]);
    
    const route = await router.route({ operationType: 'TEST' });
    if (route.tool) {
      console.log('  ✅ PASSED: Tool routing works');
      passed++;
    } else {
      console.log('  ❌ FAILED: Tool routing failed');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAILED: ${error}`);
    failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('✅ All Claude pattern integrations working correctly!');
  } else {
    console.log('⚠️  Some tests failed. Check the implementation.');
  }
  
  console.log('='.repeat(60) + '\n');
  
  return failed === 0;
}

// Run tests
runDemos().then(success => {
  process.exit(success ? 0 : 1);
});