import type { LogService } from './src/domain/logging/LogService';
import type { HudData } from './src/domain/system/TerminalInterface';
import { NodeTerminalAdapter } from './src/infrastructure/NodeTerminalAdapter';
import { COLORS } from './src/ui/design/Theme';
/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { TerminalUI } from './src/ui/terminal';

// Mock LogService
class MockLogService implements LogService {
  log(message: string) {
    console.log(`[LOG] ${message}`);
  }
  error(message: string) {
    console.error(`[ERROR] ${message}`);
  }
  warn(message: string) {
    console.warn(`[WARN] ${message}`);
  }
  debug(message: string) {
    console.debug(`[DEBUG] ${message}`);
  }
  info(message: string) {
    console.log(`[INFO] ${message}`);
  }
  logEntry(entry: any) {
    console.log(`[ENTRY] ${entry.message}`);
  }
  setMinLevel(level: any) {}
  getMinLevel() {
    return 0 as any;
  }
}

async function verify() {
  const adapter = new NodeTerminalAdapter(new MockLogService());
  const ui = new TerminalUI(adapter);

  console.clear();
  console.log(COLORS.SOVEREIGN('--- IMMERSIVE PROTOCOL VERIFICATION ---'));

  // 1. Auth Sequence
  console.log('\n[1/4] Testing Auth Sequence:');
  await ui.init('OPERATOR_01');

  // 2. Tool Use Waveforms
  console.log('\n[2/4] Testing Tool Use Waveforms:');
  ui.logToolUse('SCAN_KERNEL', { layer: 0 });

  // 3. Metabolic Shift (Heat Increase)
  console.log('\n[3/4] Testing Metabolic Shift (Heat Increase):');
  ui.logError('HEARTBEAT_STALL_DETECTED');
  await ui.logClaude('The sovereign hive is feeling the heat. Architectural decay rising.');

  // 4. Recovery (Success)
  console.log('\n[4/4] Testing Recovery (Success):');
  ui.logSuccess('CORE_ALIGNMENT_RESTORED');
  await ui.logClaude('Metabolic balance achieved.');

  console.log('\n--- VERIFICATION COMPLETE ---');
  ui.close();
}

verify().catch(console.error);
