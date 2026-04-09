import type { LogEntry } from './src/domain/logging/LogEntry';
import type { LogLevel } from './src/domain/logging/LogLevel';
import type { LogService } from './src/domain/logging/LogService';
import type { HudData } from './src/domain/system/TerminalInterface';
import { NodeTerminalAdapter } from './src/infrastructure/NodeTerminalAdapter';
import { COLORS } from './src/ui/design/Theme';
import { CinematicRenderer } from './src/ui/renderers/CinematicRenderer';
import { MetabolicRenderer } from './src/ui/renderers/MetabolicRenderer';
/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { TerminalUI } from './src/ui/terminal';

// Mock LogService
class MockLogService implements LogService {
  info(message: string) {
    console.log(`[HIVE_INFO] ${message}`);
  }
  log(message: string) {
    console.log(`[HIVE_LOG] ${message}`);
  }
  error(message: string) {
    console.error(`[CRITICAL_GLITCH] ${message}`);
  }
  warn(message: string) {
    console.warn(`[DIAGNOSTIC_WARN] ${message}`);
  }
  debug(message: string) {
    console.debug(`[AETHER_DBG] ${message}`);
  }
  logEntry(entry: LogEntry) {
    console.log(`[LOG_ENTRY] ${entry.message}`);
  }
  setMinLevel(level: LogLevel) {}
  getMinLevel(): LogLevel {
    return 'INFO' as LogLevel;
  }
}

async function verify() {
  const adapter = new NodeTerminalAdapter(new MockLogService());
  const ui = new TerminalUI(adapter);

  console.clear();
  console.log(COLORS.SOVEREIGN('--- SOVEREIGN AETHER PROTOCOL ---'));

  // 1. Transmutation Boot
  console.log('\n[1/4] Testing Transmutation Boot:');
  await ui.init('OPERATOR_AETHER');

  // 2. Hybrid Reveal (Diagnostic Scans)
  console.log('\n[2/4] Testing Hybrid Reveal (Diagnostic Scans):');
  await CinematicRenderer.hybridReveal(
    ['KERNEL_INTEGRITY: 100%', 'AGENT_HEARTBEAT: ACTIVE', 'AETHER_SIGNAL: STABLE'],
    COLORS.HIVE_GREEN,
  );

  // 3. Sovereign Glitch
  console.log('\n[3/4] Testing Sovereign Glitch:');
  await MetabolicRenderer.sovereignGlitch('SECURITY_BREACH_SIMULATED', 800);

  // 4. Hybrid HUD
  console.log('\n[4/5] Testing Hybrid HUD:');
  const mockHudData: HudData = {
    projectName: 'AETHER_CORE',
    userName: 'OPERATOR',
    agentId: 'PHANTOM',
    health: 0.95,
    activeTask: 'HYBRID_FINALITY',
  };
  ui.renderHud(mockHudData);

  // 5. Heat Pulse
  console.log('\n[5/5] Testing Metabolic Heat Pulse:');
  await MetabolicRenderer.heatPulse('SYSTEM_METABOLISM_CRITICAL', 90);

  console.log('\n--- HYBRID VERIFICATION COMPLETE ---');
  ui.close();
}

verify().catch(console.error);
