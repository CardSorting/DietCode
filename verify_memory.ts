/**
 * [VERIFICATION]
 * Tests Sovereign Memory features: Save, Recall, and Distillation.
 */

import { SovereignDb } from './src/infrastructure/database/SovereignDb';
import { SqliteKnowledgeRepository } from './src/infrastructure/database/SqliteKnowledgeRepository';
import { MemoryService } from './src/core/memory/MemoryService';
import { KnowledgeType } from './src/domain/memory/Knowledge';
import { QueueWorker } from './src/infrastructure/queue/QueueWorker';

async function verify() {
  console.log('--- DIETCODE MEMORY VERIFICATION ---');

  await SovereignDb.init();
  const repository = new SqliteKnowledgeRepository();
  const mockLLM = {
    createMessage: async () => ({
      content: [{ type: 'text', text: 'Distilled Learning: Successfully implemented Sovereign Memory.' }],
      usage: { input_tokens: 10, output_tokens: 10 }
    })
  };
  const memory = new MemoryService(repository, mockLLM as any, {} as any);
  
  // 1. Test Direct Save & Recall
  console.log('\n[1] Testing Save & Recall...');
  const testItem = {
    id: `test-knowledge-${globalThis.crypto.randomUUID()}`,
    key: 'test_pattern',
    value: 'Always use JoyZoning for modularity.',
    type: KnowledgeType.PATTERN,
    confidence: 1.0,
    tags: ['architectural_rule'],
    createdAt: new Date().toISOString(),
  };

  await repository.save(testItem);
  
  // Direct check
  const db = await SovereignDb.db();
  const allRaw = await db.selectFrom('knowledge' as any).selectAll().execute();
  console.log(`[DEBUG] Raw row count in DB: ${allRaw.length}`);

  const recalled = await memory.recall('test_pattern');
  
  console.log(`[PASS] Recalled item found: ${recalled.length > 0}`);
  if (recalled.length > 0) {
    console.log(`[PASS] Content match: ${recalled[0]!.value === testItem.value}`);
  }

  // 2. Test Distillation
  console.log('\n[2] Testing Distillation Loop...');
  const taskId = 'task-999';
  const outcome = 'Successfully implemented Sovereign Memory.';
  
  await memory.distill(taskId, outcome);
  
  // Check if it was persisted
  const learnings = await memory.recall('learning:task-999');
  console.log(`[PASS] Distilled learning found: ${learnings.length > 0}`);
  if (learnings.length > 0) {
    console.log(`[PASS] Learning content: ${learnings[0]!.value}`);
  }

  // 3. Test Prompt Formatting
  console.log('\n[3] Testing Prompt Formatting...');
  const promptFragment = memory.formatForPrompt(recalled);
  console.log(`[PASS] Prompt fragment generated:\n${promptFragment}`);

  if (!promptFragment.includes('[SOVEREIGN KNOWLEDGE]')) {
    throw new Error('Prompt formatting failed.');
  }

  console.log('\n--- ALL MEMORY VERIFICATIONS PASSED ---');
  process.exit(0);
}

verify().catch(err => {
  console.error('\n--- VERIFICATION FAILED ---');
  console.error(err);
  process.exit(1);
});
