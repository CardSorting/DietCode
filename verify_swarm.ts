/**
 * [VERIFICATION]
 * Tests SwarmAuditor and distributed coordination features.
 */

import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';
import { NodeSystemAdapter } from './src/infrastructure/NodeSystemAdapter';
import { DiscoveryService } from './src/core/context/DiscoveryService';
import { EventBus } from './src/core/orchestration/EventBus';
import { EventType } from './src/domain/Event';
import { LogLevel } from './src/domain/logging/LogLevel';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';
import { SwarmAuditor } from './src/core/orchestration/SwarmAuditor';

async function verify() {
  console.log('--- DIETCODE SWARM VERIFICATION ---');

  const fs = new FileSystemAdapter();
  const systemAdapter = new NodeSystemAdapter(fs);
  const logger = new ConsoleLoggerAdapter(LogLevel.INFO) as any; // Used for testing only
  const discovery = new DiscoveryService(fs, systemAdapter, logger);
  const eventBus = EventBus.getInstance(logger);
  const auditor = new SwarmAuditor(eventBus, logger);

  // 1. Test EventBus Integration with Auditing
  console.log('\n[1] Testing EventBus integration...');
  const context = await discovery.discover(process.cwd());
  eventBus.emit(EventType.SYSTEM_INFO_GATHERED, context.detailedContext || {});
  console.log('[PASS] EventBus event emitted');

  // 2. Test Auditing Functionality
  console.log('\n[2] Testing Audit logging...');
  await auditor.auditEvent('test-event', { type: 'system_info' });
  console.log('[PASS] Audit logged');

  console.log('\n--- ALL SWARM VERIFICATIONS PASSED ---');
}

verify().catch(err => {
  console.error('--- VERIFICATION FAILED ---');
  console.error(err);
  process.exit(1);
});