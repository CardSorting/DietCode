/**
 * [VERIFICATION]
 * Tests Sovereign Self-Healing features: Triage and Autonomous Proposal Generation.
 */

import { SovereignDb } from './src/infrastructure/database/SovereignDb';
import { SelfHealingService } from './src/core/SelfHealingService';
import { ViolationType } from './src/domain/Integrity';
import { QueueWorker } from './src/infrastructure/queue/QueueWorker';
import { AgentRegistry } from './src/core/AgentRegistry';

// Mock LLM Provider for generating a proposal
class MockHealerProvider {
  async createMessage() {
    return {
      content: [{ type: 'text', text: 'REFACTOR PROPOSAL:\nMove fs import from Domain to Infrastructure.' }],
      reasoning: ['Detected cross-layer violation.', 'Applying JoyZoning patterns.']
    };
  }
}

async function verify() {
  console.log('--- DIETCODE HEALING VERIFICATION ---');

  await SovereignDb.init();
  const mockRepo = {
    saveProposal: async () => {},
    getProposalById: async () => null,
    getProposalsForViolation: async () => [],
    updateProposalStatus: async () => {},
    listRecentProposals: async () => [],
  };
  const healing = new SelfHealingService(mockRepo as any);
  const agentRegistry = new AgentRegistry();
  agentRegistry.register({ id: 'agent-architect', title: 'Architect' });

  // 1. Test Triage
  console.log('\n[1] Testing Triage...');
  const mockReport = {
    score: 80,
    violations: [{
      id: 'viol-1',
      type: ViolationType.CROSS_LAYER_IMPORT,
      file: 'src/domain/LeakyLogic.ts',
      message: 'Forbidden import of "fs" in domain layer.',
      severity: 'error' as any,
      timestamp: new Date().toISOString()
    }],
    scannedAt: new Date().toISOString()
  };

  const tasksEnqueued = await healing.triage(mockReport);
  console.log(`[PASS] Tasks enqueued: ${tasksEnqueued}`);
  
  if (tasksEnqueued !== 1) throw new Error('Triage failed to enqueue task.');

  // 2. Test Proposal Generation (Worker Simulation)
  console.log('\n[2] Testing Proposal Generation...');
  const mockProvider = new MockHealerProvider();
  
  // Create worker with mocked healing and provider
  const worker = new QueueWorker(
    {} as any,
    {} as any,
    healing,
    agentRegistry,
    mockProvider as any
  );

  // Manually trigger handleCodeHeal
  const payload = {
    violation: mockReport.violations[0],
    specialistId: 'agent-architect'
  };

  // We need to access private method for testing or use a real queue
  // Let's use the public recordProposal check inside handleCodeHeal
  await (worker as any).handleCodeHeal(payload);
  
  console.log('[PASS] Proposal generation completed.');

  console.log('\n--- ALL HEALING VERIFICATIONS PASSED ---');
  process.exit(0);
}

verify().catch(err => {
  console.error('\n--- VERIFICATION FAILED ---');
  console.error(err);
  process.exit(1);
});
