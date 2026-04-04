import chalk from 'chalk';
import { COLORS, ICONS } from '../design/Theme';

/**
 * Pure layout functions for branding and splash elements.
 */
export const SplashRenderer = {
  /**
   * Renders the compact splash screen.
   */
  renderSplash(): string {
    const iconLines = ICONS.DIETCODE.trim().split('\n');
    const title = COLORS.HIGHLIGHT('DIETCODE');
    const subtitle = COLORS.PRIMARY('[ SOVEREIGN HIVE ARCHITECTURE ]');
    const version = COLORS.MUTED('v2.0.0');

    // Branding colors for DietCode [D|C]
    const icon = iconLines.map(l => l.replace('[D|C]', chalk.red('[D|C]'))).join('\n').split('\n');

    return [
      `  ${icon[0]}`,
      `  ${icon[1]}   ${title}`,
      `  ${icon[2]}   ${subtitle}`,
      `  ${icon[3]}   ${version}`,
      `  ${icon[4]}`,
    ].join('\n');
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
