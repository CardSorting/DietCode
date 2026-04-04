import chalk from 'chalk';
import type { HudData } from '../../domain/system/TerminalInterface';
import { BORDERS, COLORS } from '../design/Theme';

/**
 * Pure layout function for rendering the Sovereign HUD.
 */
export const HudRenderer = {
  render(data: HudData): string {
    const c = COLORS.PRIMARY;
    const g = COLORS.MUTED;
    const y = COLORS.WARNING;
    const r = COLORS.ERROR;

    const healthBar = `[${'='.repeat(Math.round(data.health * 10))}${"-".repeat(10 - Math.round(data.health * 10))}]`;

    const width = 60;
    const top = c(`${BORDERS.tl}${BORDERS.h.repeat(width)}${BORDERS.tr}`);
    const row1 = `${c(BORDERS.v)} ${COLORS.HIGHLIGHT('SOVEREIGN HUD')} | PROJECT: ${y(data.projectName.padEnd(10))} | ADMIN: ${y(data.userName.padEnd(10))} ${c(BORDERS.v)}`;
    const row2 = `${c(BORDERS.v)} AGENT: ${chalk.green(data.agentId.padEnd(10))} | HEALTH: ${r(healthBar)} | TASK: ${g((data.activeTask || 'IDLE').padEnd(14))} ${c(BORDERS.v)}`;
    const bottom = c(`${BORDERS.bl}${BORDERS.h.repeat(width)}${BORDERS.br}`);

    return [top, row1, row2, bottom].join('\n');
  },
};
