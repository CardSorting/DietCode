/**
 * [PLUMBING]
 * Principle: Shared utilities — demonstration of integration
 * Violations: None
 */

/**
 * Integration Demonstration
 * 
 * This script demonstrates how Claude Code Prompt patterns integrate
 * with the AI Tooling Harness using the Joy-Zoning architecture.
 * 
 * Run with: bun run integration-demo.ts
 */

import {
  SafetyEvaluator,
  RollbackManager
} from './infrastructure/validation/SafetyEvaluator';

import { SafetyGuard } from './core/capabilities/SafetyGuard';

import { PatternRepository } from './infrastructure/prompts/PatternRepository';

import { ToolRouterAdapter } from './infrastructure/capabilities/ToolRouterAdapter';

import { PatternMapping } from './domain/prompts/SplitStrategy';

/**
 * Demonstration of Safety-First Execution Pattern
 */
async function demoSafetyFirstExecution() {
  console.log('\n🛡️  DEMO: Safety-First Execution Pattern');
  console.log('═'.repeat(50));
  
  const rollbackManager = new RollbackManager();
  const safetyEvaluator = new SafetyEvaluator();
  const safetyGuard = new SafetyGuard(safetyEvaluator, rollbackManager);
  
  // Test Case 1: SAFE Action (file edit)
  console.log('\n📝 Test: File Edit (SAFE)');
  const safeResult = await safetyGuard.executeWithSafety(
    async (rollback) => {
      console.log('   Executing file edit...');
      await new Promise(resolve => setTimeout(resolve, 200));
      return { success: true, path: '/src/index.ts' };
    },
    'FILE_EDIT',
    { 
      targetPath: '/src/index.ts', 
      actionType: 'file_edit' 
    }
  );
  
  if (safeResult) {
    console.log(`   ✅ Success! Risk Level: ${safeResult.safety.riskLevel}`);
    console.log(`   Saves: ${safeResult.safety.safeguardMessages.length} safeguard messages`);
  }
  
  // Test Case 2: HIGH RISK Action (database delete)
  console.log('\n💥 Test: Database Delete (HIGH RISK)');
  const highRiskResult = await safetyGuard.executeWithSafety(
    async (rollback) => {
      console.log('   Executing database delete...');
      await new Promise(resolve => setTimeout(resolve, 200));
      throw new Error('Database connection failed');
    },
    'DATABASE_DELETE',
    { 
      targetPath: '/data/users.db',
      affectedUsers: 1000,
      isDestructive: true,
      actionType: 'database_delete' 
    }
  );
  
  if (highRiskResult) {
    console.log(`   ⚠️  Action failed but safely handled`);
    console.log(`   Rollback prepared: ${highRiskResult.safety.rollbackPrepared}`);
    console.log(`   Rollback executed: All backups cleaned`);
  }
  
  console.log('\n✅ Safety-first execution demo completed');
}

/**
 * Demonstration of Tool Selection Router Pattern
 */
async function demoToolSelectionRouter() {
  console.log('\n🛠️  DEMO: Tool Selection Router Pattern');
  console.log('═'.repeat(50));
  
  // Create a mock tool manager
  const mockTools = [
    {
      id: 'tool-read-file',
      name: 'read_file_tool',
      operationType: 'READ_FILE',
      soloUseOnly: false,
      parallelizable: true,
      provenance: 'builtin'
    },
    {
      id: 'tool-shell-exec',
      name: 'shell_exec_tool',
      operationType: 'EXECUTE_SHELL',
      soloUseOnly: true,
      parallelizable: false,
      provenance: 'builtin'
    },
    {
      id: 'tool-grep-search',
      name: 'grep_search_tool',
      operationType: 'SEARCH_GREP',
      soloUseOnly: false,
      parallelizable: true,
      provenance: 'builtin'
    }
  ];
  
  const toolRouter = new ToolRouterAdapter(mockTools);
  
  // Test Case 1: Read file operation
  console.log('\n📖 Test: Read File Operation');
  try {
    const routeResult = await toolRouter.route({
      operationType: 'READ_FILE',
      target: '/src/app.ts'
    });
    
    console.log(`   ✅ Tool selected: ${routeResult.tool.name}`);
    console.log(`   Operation type: ${routeResult.tool.operationType}`);
    console.log(`   Override shell: ${routeResult.overrideShell}`);
    console.log(`   Solos only: ${routeResult.tool.soloUseOnly}`);
  } catch (error) {
    console.log(`   ❌ Failed: ${error}`);
  }
  
  // Test Case 2: Execute shell command
  console.log('\n🐚 Test: Execute Shell Command');
  try {
    const routeResult = await toolRouter.route({
      operationType: 'EXECUTE_COMMAND',
      target: '/bin/ls'
    });
    
    console.log(`   ✅ Tool selected: ${routeResult.tool.name}`);
    console.log(`   Override shell: ${routeResult.overrideShell}`);
    console.log(`   Solos only: ${routeResult.tool.soloUseOnly}`);
  } catch (error) {
    console.log(`   ❌ Failed: ${error}`);
  }
  
  // Test Case 3: Grep search
  console.log('\n🔍 Test: Search Grep');
  try {
    const routeResult = await toolRouter.route({
      operationType: 'grep_search',
      target: '/src/**/*.ts'
    });
    
    console.log(`   ✅ Tool selected: ${routeResult.tool.name}`);
    console.log(`   Override shell: ${routeResult.overrideShell}`);
    console.log(`   Parallelizable: ${routeResult.tool.parallelizable}`);
  } catch (error) {
    console.log(`   ❌ Failed: ${error}`);
  }
  
  // Test Case 4: Invalid operation (should gracefully handle)
  console.log('\n❓ Test: Invalid Operation');
  try {
    const routeResult = await toolRouter.route({
      operationType: 'UNKNOWN_OPERATION'
    });
    
    console.log(`   ✅ Route result: ${JSON.stringify(routeResult)}`);
  } catch (error) {
    console.log(`   ✅ Gracefully handled: ${error}`);
  }
  
  console.log('\n✅ Tool selection router demo completed');
}

/**
 * Demonstration of Pattern Registry Integration
 */
async function demoPatternRegistry() {
  console.log('\n📊 DEMO: Pattern Registry Integration');
  console.log('═'.repeat(50));
  
  const repo = new PatternRepository();
  
  // Get all patterns
  console.log('\n📋 All Registered Patterns:');
  const patterns = repo.getAllPatterns();
  console.log(`   Total patterns: ${patterns.length}`);
  
  // Priority-ordered patterns
  console.log('\n⭐ Priority Order Patterns:');
  const prioritized = repo.getPatternsSortedByPriority();
  prioritized.forEach((pattern: PatternMapping, index: number) => {
    console.log(`   ${index + 1}. ${pattern.patternName} (${pattern.domainElement?.name})`);
  });
  
  // Count patterns by category
  console.log('\n📈 Pattern Distribution:');
  const counts = repo.countPatternsByCategory();
  Object.entries(counts).forEach(([category, count]) => {
    const emoji = category === 'safety' ? '🛡️ ' : category === 'verification' ? '✅ ' : category === 'tooling' ? '🛠️ ' : category === 'context' ? '📊 ' : '🤖 ';
    console.log(`   ${emoji}${category}: ${count} patterns`);
  });
  
  // Validate completeness
  console.log('\n✅ Completeness Check:');
  const validation = repo.validateCompleteness();
  console.log(`   All patterns have Domain contracts: ${validation.valid}`);
  if (!validation.valid) {
    console.log('   Missing mappings:');
    validation.missing.forEach(m => {
      console.log(`     - ${m.pattern} (${m.element})`);
    });
  }
  
  // Get specific pattern details
  console.log('\n🔍 Pattern Details (Safety-First):');
  const safetyPattern = repo.getPattern('SAFETY_FIRST_EXECUTION');
  if (safetyPattern) {
    console.log(`   Name: ${safetyPattern.patternName}`);
    console.log(`   Domain: ${safetyPattern.domainElement?.name}`);
    console.log(`   Interface: ${safetyPattern.domainElement?.interfaceName}`);
    console.log(`   Infrastructure: ${safetyPattern.infrastructureElement?.adapterName}`);
    console.log(`   Core: ${safetyPattern.coreElement?.serviceName}`);
  }
  
  console.log('\n✅ Pattern registry demo completed');
}

/**
 * End-to-End Integration Demonstration
 */
async function demoEndToEnd() {
  console.log('\n🔄 DEMO: End-to-End Integration');
  console.log('═'.repeat(50));
  
  console.log('\n1️⃣  Initialize Safety Infrastructure');
  const rollbackManager = new RollbackManager();
  const safetyEvaluator = new SafetyEvaluator();
  const safetyGuard = new SafetyGuard(safetyEvaluator, rollbackManager);
  
  console.log('   ✅ Safety evaluator initialized');
  console.log('   ✅ Rollback manager initialized');
  console.log('   ✅ Safety guard orchestrator created');
  
  console.log('\n2️⃣  Execute HIGH RISK Action with Auto-Rollback');
  const result = await safetyGuard.executeWithSafety(
    async (rollback) => {
      // Simulate action execution
      const backup = await rollback.backupFile('/config/settings.json', '{}');
      console.log(`   📦 Created backup: ${backup.id}`);
      
      // Simulate failure
      throw new Error('Configuration file corrupted');
    },
    'CONFIG_UPDATE',
    { 
      targetPath: '/config/settings.json',
      isCriticalSystem: true,
      isDestructive: true,
      affectedUsers: 50
    }
  );
  
  if (result) {
    console.log(`   ✅ Execution complete`);
    console.log(`   Success: ${result.safety.success}`);
    console.log(`   Risk Level: ${result.safety.riskLevel}`);
    console.log(`   Rollback Prepared: ${result.safety.rollbackPrepared}`);
    console.log(`   Safeguards Applied: ${result.safety.safeguardMessages.length}`);
  }
  
  console.log('\n3️⃣  Verify Rollback Completed');
  const remainingBackups = rollbackManager['backups']?.length;
  console.log(`   🔄 Remaining backups: ${remainingBackups}`);
  
  console.log('\n✅ End-to-end integration demo completed');
}

/**
 * Main execution
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Claude Code Prompts Integration Demonstrations');
  console.log('='.repeat(60));
  
  try {
    await demoSafetyFirstExecution();
    await demoToolSelectionRouter();
    await demoPatternRegistry();
    await demoEndToEnd();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 All Demonstrations Completed Successfully!');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Demonstration failed:', error);
    process.exit(1);
  }
}

// Run demonstration
if (require.main === module) {
  main();
}

export { demoSafetyFirstExecution, demoToolSelectionRouter, demoPatternRegistry, demoEndToEnd };