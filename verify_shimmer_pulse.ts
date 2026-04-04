import { MetabolicRenderer } from './src/ui/renderers/MetabolicRenderer';
import { COLORS } from './src/ui/design/Theme';

async function verify() {
  console.clear();
  console.log(COLORS.SOVEREIGN("--- GRADIENT SHIMMER VERIFICATION ---"));

  // 1. Stable Shimmer (Cyan)
  console.log("\n[1/3] Testing Stable Shimmer (Low Heat):");
  await MetabolicRenderer.shimmerPulse("NEON_SYSTEM_STABLE", 20, 2);

  // 2. Active Shimmer (Pink/Purple)
  console.log("\n[2/3] Testing Active Shimmer (Medium Heat):");
  await MetabolicRenderer.shimmerPulse("AETHER_SYNC_PROCESSING", 65, 2);

  // 3. Critical Shimmer (Crimson)
  console.log("\n[3/3] Testing Critical Shimmer (High Heat):");
  await MetabolicRenderer.shimmerPulse("CRITICAL_METABOLIC_OVERLOAD", 95, 2);

  console.log("\n--- VERIFICATION COMPLETE ---");
}

verify().catch(console.error);
