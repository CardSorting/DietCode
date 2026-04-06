import chalk from 'chalk';
import { AESTHETIC, COLORS, ICONS } from '../design/Theme';
import { CinematicRenderer } from './CinematicRenderer';
import { MetabolicRenderer } from './MetabolicRenderer';

/**
 * Pure layout functions for branding and splash elements.
 */
export const SplashRenderer = {
  /**
   * Renders the compact splash screen.
   */
  renderSplash(profile = 'AETHER'): string {
    const logo = (ICONS as any).CINEMATIC_LOGO || AESTHETIC.getLogo(profile || 'AETHER');
    const title = COLORS.HIGHLIGHT('DIETCODE');
    const subtitle = COLORS.PRIMARY('[ SOVEREIGN HIVE ARCHITECTURE ]');
    const version = COLORS.MUTED('v2.2.0-CINEMATIC');
    
    // Inject ambient color drift into the logo lines
    const logoLines = logo.trim().split('\n').map((line: string, i: number) => {
        return COLORS.applyRainbowShimmer(line, i / 10);
    });

    return [
      ...logoLines,
      `  ${title} ${subtitle} ${version}`,
    ].join('\n');
  },

  async bootSequence(profile = 'AETHER'): Promise<void> {
    const diagnostics = [
      'INIT: Sovereign Kernel 2.2 [OK]',
      'SYNCING_DREAMSTATE... [98%]',
      'DECRYPTING_HIVE_MEMORIES... [RESTORED]',
      'ZENITH_MODE: ACTIVATED',
    ];

    await CinematicRenderer.wipe();
    
    // Phase 1: Neural Handshake (Turbo Data Burst)
    await CinematicRenderer.dataBurst(3);
    await CinematicRenderer.neonWipe();
    
    // Phase 2: Ultra-Fast Diagnostics
    process.stdout.write(`${COLORS.HIVE_CYAN('[ NEURAL_DREAMSTATE_SYNC ]')}\n`);
    for (const msg of diagnostics) {
        const prefix = COLORS.MUTED(`[0x${Math.random().toString(16).slice(2, 6).toUpperCase()}]`);
        process.stdout.write(`${prefix} ${msg}\n`);
        await new Promise(r => setTimeout(r, 10));
    }

    // Phase 3: Visual Climax (Lightning Storm)
    await MetabolicRenderer.zenithStorm('--- SOVEREIGN_HIVE_CONVERGENCE ---', 300);
    
    // Phase 4: Cinematic Header Reveal
    const splash = this.renderSplash(profile).split('\n');
    await CinematicRenderer.revealLines(splash, 5);
    
    // Phase 5: Final Shimmer Pulse
    await MetabolicRenderer.shimmerPulse(' [ DREAMSTATE_STABLE ] ', 30, 1);
  },

  /**
   * Renders a premium soda can.
   */
  renderPremiumCan(): string {
    return COLORS.PRIMARY(
      ICONS.PREMIUM.replace('*', chalk.yellow('*')).replace('[S|H]', chalk.blue('[S|H]')),
    );
  },

  /**
   * Renders a metric with status color.
   */
  renderMetric(label: string, value: number, warn: number, error: number, lowerIsBetter = false): string {
    let color = COLORS.SUCCESS;
    if (lowerIsBetter) {
      if (value > error) color = COLORS.ERROR;
      else if (value > warn) color = COLORS.WARNING;
    } else {
      if (value > error) color = COLORS.ERROR;
      else if (value > warn) color = COLORS.WARNING;
    }

    return `${label.padEnd(15)} : ${color(value.toFixed(2))}`;
  },
};
