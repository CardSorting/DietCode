import { COLORS } from '../design/Theme';
import { CinematicRenderer } from '../renderers/CinematicRenderer';
import { MetabolicRenderer } from '../renderers/MetabolicRenderer';

/**
 * [LAYER: COMPONENT]
 * Sovereign Aether Hybrid — Zenith Boot Sequence (Matrix Edition).
 */
export class AuthSequence {
  /**
   * Performs the ultimate cinematic authentication.
   * Features kinetic reveals, zenith storm breaches, and matrix-convergence resolution.
   */
  public async authenticate(userName: string): Promise<void> {
    console.log(`\n${COLORS.HIVE_GREEN('--- SOVEREIGN PEAK ZENITH BOOT ---')}\n`);
    
    // Phase 1: Kinetic Diagnostics (Bouncing reveal)
    await CinematicRenderer.kineticReveal([
      'SCANNING_HIVE_STRUCTURE... [100%]',
      'VERIFYING_CORE_SYMMETRY... [SYMMETRICAL]',
      'MAPPING_AXIOM_RESONANCE... [COMPLETED]'
    ]);
    
    await MetabolicRenderer.axiomScan(30);
    
    await new Promise(r => setTimeout(r, 400));
    
    // Phase 2: Transmutation with Sub-frame Blur
    await CinematicRenderer.blurType('INITIATING_SPECTRUM_BLEED_V3...', 15);
    await MetabolicRenderer.decrypt('MELDING_NEURAL_UPLINK...', 25);
    
    // Phase 3: Zenith Storm Breach (Motion Trails)
    await MetabolicRenderer.zenithStorm('ZENITH_RESONANCE_ESTABLISHED', 1000);
    
    await new Promise(r => setTimeout(r, 400));
    
    // Final Phase: Matrix Convergence Resolution
    // Instead of kinetic reveal, we use the matrix-scramble that "locks" into readability.
    await MetabolicRenderer.matrixReveal(`ZENITH_ACCESS_GRANTED: ${userName}`, COLORS.AESTHETIC_PURPLE);
    await MetabolicRenderer.matrixReveal('HIVE_DREAMSTATE: SUSTAINED', COLORS.AESTHETIC_PINK);
    
    await new Promise(r => setTimeout(r, 500));
    console.log(`\n${COLORS.SUCCESS('SIGNAL_FINALITY: UNLOCKED.')}\n`);
  }
}
