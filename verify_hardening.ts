/**
 * [VERIFICATION]
 * Tests the new event-driven lifecycle and rich discovery features.
 */

import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';
import { LogLevel } from './src/domain/logging/LogLevel';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';
import { EventBus } from './src/core/orchestration/EventBus';
import { EventType } from './src/domain/Event';
import { DiscoveryService } from './src/core/context/DiscoveryService';
import { NodeSystemAdapter } from './src/infrastructure/NodeSystemAdapter';

async function verify() {
  console.log('--- DIETCODE HARDENING VERIFICATION ---');
  
  // Create logger for EventBus
  const logger = new ConsoleLoggerAdapter(LogLevel.DEBUG);
  
  const fs = new FileSystemAdapter();
  const systemAdapter = new NodeSystemAdapter(fs, logger);
  const discovery = new DiscoveryService(fs, systemAdapter, logger);
  const eventBus = EventBus.getInstance(logger);

  // 1. Test EventBus Subscriptions
  let eventReceived = false;
  eventBus.on(EventType.SYSTEM_INFO_GATHERED, (event: any) => {
    console.log(`[PASS] Received event: ${event.type}`);
    console.log(`[PASS] Payload platform: ${event.data.platform}`);
    eventReceived = true;
  });

  // 2. Test Rich Discovery
  console.log('Testing discovery...');
  const context = await discovery.discover(process.cwd());
  
  if (context.detailedContext) {
    console.log('[PASS] Detailed context gathered.');
    console.log(`[PASS] OS: ${context.detailedContext.system.os.platform}`);
    console.log(`[PASS] Node: ${context.detailedContext.system.runtime.nodeVersion}`);
    if (context.detailedContext.repo.git) {
      console.log(`[PASS] Git Branch: ${context.detailedContext.repo.git.branch}`);
    } else {
      console.log('[WARN] Git context not found (might not be a repo).');
    }
    console.log(`[PASS] Dependencies count: ${Object.keys(context.detailedContext.repo.dependencies).length}`);
  } else {
    throw new Error('Detailed context missing in discovery result.');
  }

  if (!eventReceived) {
    throw new Error('Lifecycle event was not emitted during discovery.');
  }

  // 3. Test Manual Event Emission
  console.log('Testing manual event emission...');
  eventBus.emit(EventType.SKILL_LOADED, { name: 'test-skill', path: '/tmp/test.md' });

  console.log('--- ALL VERIFICATIONS PASSED ---');
}

verify().catch(err => {
  console.error('--- VERIFICATION FAILED ---');
  console.error(err);
  process.exit(1);
});