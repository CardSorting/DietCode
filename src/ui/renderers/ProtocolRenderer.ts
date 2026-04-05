import chalk from 'chalk';
import { BORDERS, COLORS, ICONS } from '../design/Theme';
import { MetabolicRenderer } from './MetabolicRenderer';

/**
 * [LAYER: UI RENDERER]
 * Sovereign Hive Connectivity Protocol - Specialized Layouts.
 */
export const ProtocolRenderer = {
  /**
   * Renders a header for a specific onboarding step.
   */
  renderStepHeader(step: number, total: number, title: string): string {
    const progress = Math.round((step / total) * 100);
    const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
    
    return [
      '\n',
      COLORS.HIVE_CYAN(`[ STEP ${step}/${total} ] ${title.toUpperCase()}`),
      COLORS.MUTED(` PROGRESS: [${bar}] ${progress}%`),
      '\n'
    ].join('\n');
  },

  /**
   * Renders the current status of all providers.
   */
  renderConnectivityStatus(providers: { name: string, status: 'CONNECTED' | 'PENDING' | 'MISSING' }[]): string {
    const lines = providers.map(p => {
      let statusText = '';
      if (p.status === 'CONNECTED') statusText = COLORS.SUCCESS('CONNECTED');
      else if (p.status === 'PENDING') statusText = COLORS.WARNING('PENDING');
      else statusText = COLORS.ERROR('MISSING');
      
      return ` ${ICONS.GEAR} ${p.name.padEnd(12)} : ${statusText}`;
    });

    const box = [
      COLORS.PRIMARY(`${BORDERS.tl}${BORDERS.h} HIVE CONNECTIVITY STATUS ${BORDERS.h.repeat(15)}${BORDERS.tr}`),
      ...lines.map(l => `${COLORS.PRIMARY(BORDERS.v)} ${l.padEnd(38)} ${COLORS.PRIMARY(BORDERS.v)}`),
      COLORS.PRIMARY(`${BORDERS.bl}${BORDERS.h.repeat(40)}${BORDERS.br}`)
    ].join('\n');

    return `\n${box}\n`;
  },

  /**
   * Renders a validation "Pulse" effect.
   */
  async renderValidationPulse(message: string): Promise<void> {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    for (let i = 0; i < 20; i++) {
        process.stdout.write(`\r ${COLORS.HIVE_GOLD(frames[i % frames.length])} ${message}...`);
        await new Promise(r => setTimeout(r, 80));
    }
    process.stdout.write(`\r${' '.repeat(50)}\r`);
  },

  /**
   * Renders a "Success" confirmation in a cinematic way.
   */
  async renderSuccess(message: string): Promise<void> {
    console.log(`\n ${COLORS.SUCCESS(ICONS.CHECK)} ${COLORS.HIGHLIGHT(message)}`);
    await MetabolicRenderer.axiomScan(20);
  }
};
