import { TerminalUI } from './src/ui/terminal';
import { NodeTerminalAdapter } from './src/infrastructure/NodeTerminalAdapter';
import type { LogService } from './src/domain/logging/LogService';
import type { HudData } from './src/domain/system/TerminalInterface';
import { COLORS } from './src/ui/design/Theme';
import { CinematicRenderer } from './src/ui/renderers/CinematicRenderer';
import { MetabolicRenderer } from './src/ui/renderers/MetabolicRenderer';

// Mock LogService
class MockLogService implements LogService {
  log(message: string) { console.log(`[VAPOR_LOG] ${message}`); }
  error(message: string) { console.error(`[AETHER_ERR] ${message}`); }
  warn(message: string) { console.warn(`[MIDNIGHT_WARN] ${message}`); }
  debug(message: string) { console.debug(`[DREAM_DBG] ${message}`); }
  info(message: string) { console.log(`[INFO] ${message}`); }
  logEntry(entry: any) { console.log(`[ENTRY] ${entry.message}`); }
  setMinLevel(level: any) {}
  getMinLevel() { return 0 as any; }
}

async function verify() {
  const adapter = new NodeTerminalAdapter(new MockLogService());
  const ui = new TerminalUI(adapter);

  console.clear();
  console.log(COLORS.SOVEREIGN("--- VAPORWAVE CYBER PROTOCOL ---"));

  // 1. Midnight Login
  console.log("\n[1/4] Testing Midnight Login:");
  await ui.init("DREAMER_01");

  // 2. Smooth Flow & Shimmer
  console.log("\n[2/4] Testing Smooth Flow & Shimmer:");
  await CinematicRenderer.smoothFlow(COLORS.NEON_PINK("Streaming aether waves into the console..."), 15);
  await CinematicRenderer.shimmerReveal([
    COLORS.NEON_CYAN("NEON_NODE_01: ONLINE"),
    COLORS.SOFT_PURPLE("CORE_DREAM: SYNCED")
  ]);

  // 3. Aether Glitch
  console.log("\n[3/4] Testing Aether Glitch:");
  await MetabolicRenderer.aetherGlitch("SYSTEM_DRIFT_DETECTED", 800);

  // 4. Vapor HUD
  console.log("\n[4/4] Testing Vapor HUD:");
  const mockHudData: HudData = {
    projectName: "NEURAL_OCEAN",
    userName: "DREAMER",
    agentId: "SYNESTHESIA",
    health: 0.88,
    activeTask: "MINTING_AESTHETICS"
  };
  ui.renderHud(mockHudData);

  console.log("\n--- AESTHETIC VERIFICATION COMPLETE ---");
  ui.close();
}

verify().catch(console.error);
