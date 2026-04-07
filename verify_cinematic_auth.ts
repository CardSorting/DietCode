/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { TerminalUI } from './src/ui/terminal';
import { NodeTerminalAdapter } from './src/infrastructure/NodeTerminalAdapter';
import type { LogService } from './src/domain/logging/LogService';
import type { HudData } from './src/domain/system/TerminalInterface';
import { COLORS } from './src/ui/design/Theme';
import { MetabolicRenderer } from './src/ui/renderers/MetabolicRenderer';
import { AuthSequence } from './src/ui/components/AuthSequence';
import type { LogEntry } from './src/domain/logging/LogEntry';
import type { LogLevel } from './src/domain/logging/LogLevel';

// Mock LogService
class MockLogService implements LogService {
  info(message: string) { console.log(`[HIVE_INFO] ${message}`); }
  log(message: string) { console.log(`[HIVE_LOG] ${message}`); }
  error(message: string) { console.error(`[CRITICAL_GLITCH] ${message}`); }
  warn(message: string) { console.warn(`[DIAGNOSTIC_WARN] ${message}`); }
  debug(message: string) { console.debug(`[AETHER_DBG] ${message}`); }
  logEntry(entry: LogEntry) { console.log(`[LOG_ENTRY] ${entry.message}`); }
  setMinLevel(level: LogLevel) {}
  getMinLevel(): LogLevel { return 'INFO' as LogLevel; }
}

async function verify() {
  const adapter = new NodeTerminalAdapter(new MockLogService());
  const ui = new TerminalUI(adapter);
  const auth = new AuthSequence();

  console.clear();
  console.log(COLORS.SOVEREIGN("--- FULL CINEMATIC AUTH VERIFICATION ---"));

  // 1. Full Auth Sequence
  console.log("\n[1/2] Initiating Deep-Hive Authentication:");
  await auth.authenticate("OPERATOR_AETHER");

  // 2. Zenith Storm Burst (Standalone)
  console.log("\n[2/2] Testing Standalone Zenith Storm Burst:");
    await MetabolicRenderer.zenithStorm('ZENITH_RESONANCE_ESTABLISHED', 1000);

  console.log("\n--- CINEMATIC VERIFICATION COMPLETE ---");
  ui.close();
}

verify().catch(console.error);
