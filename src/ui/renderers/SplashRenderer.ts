import chalk from 'chalk';
import { AESTHETIC, COLORS, ICONS } from '../design/Theme';
import { CinematicRenderer } from './CinematicRenderer';

/**
 * Pure layout functions for branding and splash elements.
 */
export const SplashRenderer = {
  /**
   * Renders the compact splash screen.
   */
  renderSplash(profile = 'AETHER'): string {
    const logo = AESTHETIC.getLogo(profile || 'AETHER');
    const iconLines = logo.trim().split('\n');
    const title = COLORS.HIGHLIGHT('DIETCODE');
    const subtitle = COLORS.PRIMARY('[ SOVEREIGN HIVE ARCHITECTURE ]');
    const version = COLORS.MUTED('v2.0.0');

    // Branding colors for DietCode [D|C]
    const icon = iconLines.map(l => l.replace('[D|C]', chalk.red('[D|C]'))).join('\n').split('\n');

    return [
      `  ${icon[0] || ''}`,
      `  ${icon[1] || ''}`,
      `  ${icon[2] || ''}`,
      `  ${icon[3] || ''}`,
      `  ${icon[icon.length - 1] || ''}`,
    ].join('\n');
  },

  /**
   * Performs a cinematic boot sequence.
   */
  async bootSequence(profile = 'AETHER'): Promise<void> {
    const diagnostics = [
      'INIT: Sovereign Kernel [OK]',
      'SYNC: Hive Memory Core [OK]',
      'SCAN: Agent Phantoms [8 FOUND]',
      'BOOT: DietCode OS v2.0...',
    ];

    for (const msg of diagnostics) {
      await CinematicRenderer.hardType(COLORS.MUTED(`[DEBUG] ${msg}`), 5);
      await new Promise(r => setTimeout(r, 50));
    }

    console.log('\n');
    await CinematicRenderer.revealLines(this.renderSplash(profile).split('\n'), 50);
    console.log('\n');
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
