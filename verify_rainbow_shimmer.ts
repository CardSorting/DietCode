import { MetabolicRenderer } from './src/ui/renderers/MetabolicRenderer';
import { COLORS } from './src/ui/design/Theme';

async function verify() {
  console.clear();
  console.log(COLORS.SOVEREIGN("--- SOVEREIGN RAINBOW SHIMMER (LIQUID NEON) ---"));

  // 1. Rainbow Shimmer
  console.log("\n[1/2] Testing Liquid Neon Rainbow (Full Spectrum):");
  await MetabolicRenderer.rainbowPulse("HIVE_PROTOCOL_LIQUID_NEON_FINALITY", 2);

  // 2. High Density Shimmer
  console.log("\n[2/2] Testing Dense Shimmer (Fast Spectrum):");
  for (let i = 0; i < 50; i++) {
    const rainbow = COLORS.applyRainbowShimmer("DENSITY_SHIMMER_RESONANCE", i * 0.05);
    process.stdout.write(`\r${rainbow}`);
    await new Promise(r => setTimeout(r, 20));
  }
  process.stdout.write('\n');

  console.log("\n--- VERIFICATION COMPLETE ---");
}

verify().catch(console.error);
