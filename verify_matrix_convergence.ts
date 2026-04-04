import { MetabolicRenderer } from './src/ui/renderers/MetabolicRenderer';
import { COLORS } from './src/ui/design/Theme';

async function verify() {
  console.clear();
  console.log(COLORS.SOVEREIGN("--- MATRIX CONVERGENCE VERIFICATION ---"));

  // 1. Matrix Reveal (Vapor Purple)
  console.log("\n[1/2] Resolving Aether Protocol (Purple):");
  await MetabolicRenderer.matrixReveal("AETHER_PROTOCOL_V2: ACTIVE", COLORS.AESTHETIC_PURPLE, 50);

  // 2. Matrix Reveal (Vapor Pink)
  console.log("\n[2/2] Resolving System Dream (Pink):");
  await MetabolicRenderer.matrixReveal("SYSTEM_DREAM: SYNCHRONIZED", COLORS.AESTHETIC_PINK, 30);

  console.log("\n--- VERIFICATION COMPLETE ---");
}

verify().catch(console.error);
