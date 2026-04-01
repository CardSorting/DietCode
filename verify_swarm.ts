/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Adapters and integrations — connects the outside world to domain contracts.
 * Violations: None
 */

import { AgentRegistry } from './src/core/capabilities/AgentRegistry';
import { HandoverService } from './src/core/orchestration/HandoverService';
import { Orchestrator } from './src/core/orchestration/orchestrator';
import { EventBus } from './src/core/orchestration/EventBus';
import { EventType } from './src/domain/Event';
import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';
import type { SessionRepository } from './src/domain/context/SessionRepository';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';
import { LogLevel } from './src/domain/logging/LogLevel';

// Mock Provider for testing handover detection
class MockProvider {
  async createMessage() {
    return {
      content: [{ type: 'text', text: '[HANDOVER: agent-architect] Found layer violation.' }],
      reasoning: []
    };
  }
}

async function verify() {
  console.log('--- DIETCODE SWARM VERIFICATION ---');

  const fs = new FileSystemAdapter();
  const agentRegistry = new AgentRegistry();
  const mockSessionRepo: SessionRepository = {
    ensureProject: async () => {},
    createSession: async () => 'test-session',
    updateSessionAgent: async () => {},
    appendMessage: async () => {},
    updateSessionStatus: async () => {},
    getSession: async () => null,
    getSessions: async () => []
  } as any;
  const handoverService = new HandoverService(agentRegistry, mockSessionRepo);
  const logger = new ConsoleLoggerAdapter(LogLevel.debug);
  const eventBus = EventBus.getInstance(logger);

  // 1. Test Registration
  console.log('\n[1] Testing Dynamic Registration...');
  agentRegistry.register({ id: 'agent-dietcode', title: 'Router' });
  agentRegistry.register({ id: 'agent-architect', title: 'Architect' });

  const agents = agentRegistry.getAllAgents();
  console.log(`[PASS] Registered agents: ${agents.map(a => a.id).join(', ')}`);

  if (agents.length < 2) throw new Error('Registration failed.');

  // 2. Test Handover Mechanism
  console.log('\n[2] Testing Handover Detection...');
  
  // We'll mock the minimal dependencies needed for Orchestrator
  const mockOrchestrator = new Orchestrator(
    new MockProvider() as any,
    { logClaude: () => {}, logError: () => {}, logToolUse: () => {} } as any,
    { getAllTools: () => [] } as any,
    { isCommand: () => false } as any,
    { 
      ensureProject: async () => {}, 
      createSession: async () => 'test-session', 
      appendMessage: async () => {},
      updateSessionStatus: async () => {} 
    } as any,
    { recordDecision: async () => {} } as any,
    { recordAction: async () => {} } as any,
    agentRegistry,
    { gather: async () => ({ cwd: '', filesSummary: { totalFiles: 0, stats: [] }, activeBranch: '' }) } as any,
    { resolve: async () => [] } as any,
    { prune: (a: any) => a } as any,
    { isIgnored: () => false } as any,
    handoverService,
    { recall: async () => [], formatForPrompt: () => '' } as any,
    { repository: { path: process.cwd() } } as any
  );

  let handoverEmitted = false;
  eventBus.on(EventType.RESPONSE_GENERATED, () => {
     // This will be called after first iteration
  });

  // We need to trigger the loop once
  // In our test, MockProvider returns a handover command.
  // Orchestrator.run will detect it and swap the agent.
  
  await (mockOrchestrator as any).run('Perform audit');
  
  const currentAgent = (mockOrchestrator as any).agent;
  console.log(`[PASS] Agent after handover: ${currentAgent.id}`);

  if (currentAgent.id !== 'agent-architect') {
    throw new Error('Handover failed to swap agent.');
  }

  console.log('\n--- ALL SWARM VERIFICATIONS PASSED ---');
}

verify().catch(err => {
  console.error('\n--- VERIFICATION FAILED ---');
  console.error(err);
  process.exit(1);
});
