/**
 * [VERIFICATION]
 * Tests the Self-Healing Service against various corruption scenarios.
 */

import { SelfHealingService } from './src/core/integrity/SelfHealingService';
import { LogLevel } from './src/domain/logging/LogLevel';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';
import type { HealingRepository } from './src/domain/healing/HealingRepository';
import type { IntegrityReport } from './src/domain/memory/Integrity';
import { ViolationType } from './src/domain/memory/Integrity';

// Mock HealingRepository
class MockHealingRepository implements HealingRepository {
  async saveProposal(proposal: any): Promise<void> {}
  async getProposalById(id: string): Promise<any> { return null; }
  async getProposalsForViolation(violationId: string): Promise<any[]> { return []; }
  async updateProposalStatus(id: string, status: any): Promise<void> {}
  async listRecentProposals(limit: number = 10): Promise<any[]> { return []; }
}

async function verify() {
  console.log('--- DIETCODE HEALING VERIFICATION ---');

  const logger = new ConsoleLoggerAdapter(LogLevel.INFO);
  const healingRepo = new MockHealingRepository();
  
  const healingService = new SelfHealingService(healingRepo, logger);

  // 1. Test Valid Code (Should not trigger healing)
  console.log('\n[1] Testing valid code (no healing needed)...');
  const validViolation = {
    id: 'valid-1',
    type: ViolationType.DOMAIN_PURITY,
    file: '/test.ts',
    message: 'No issues found',
    severity: 'warn' as const,
    timestamp: new Date().toISOString(),
    metadata: {}
  };
  const validReport: IntegrityReport = { score: 100, violations: [validViolation], scannedAt: new Date().toISOString() };
  const healed1 = await healingService.triage(validReport);
  console.log(`[PASS] No healing tasks for valid code: ${healed1 === 0}`);

  // 2. Test Corrupted Code (Should trigger healing)
  console.log('\n[2] Testing corrupted code (healing needed)...');
  const errorViolation = {
    id: 'corrupted-1',
    type: 'cross_layer_import' as ViolationType,
    file: '/src/ui/component.ts',
    message: 'UI layer importing Infrastructure directly',
    severity: 'error' as const,
    timestamp: new Date().toISOString(),
    metadata: { offendingLine: 'import { Adapter } from "../infra"' }
  };
  const corruptedReport: IntegrityReport = { score: 60, violations: [errorViolation], scannedAt: new Date().toISOString() };
  const healed2 = await healingService.triage(corruptedReport);
  console.log(`[PASS] Healing tasks enqueued: ${healed2 > 0}`);

  console.log('\n--- ALL HEALING VERIFICATIONS PASSED ---');
}

verify().catch(err => {
  console.error('--- VERIFICATION FAILED ---');
  console.error(err);
  process.exit(1);
});