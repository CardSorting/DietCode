/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { HudData } from '../../domain/system/TerminalInterface';
import { BORDERS, COLORS } from '../design/Theme';

/**
 * Pure layout function for rendering the Sovereign Aether HUD.
 */
export const HudRenderer = {
  render(data: HudData): string {
    const c = COLORS.HIVE_CYAN;
    const g = COLORS.MUTED;
    const y = COLORS.HIVE_GOLD;
    const p = COLORS.AESTHETIC_PINK;
    const s = COLORS.SOVEREIGN;
    const h = COLORS.HIVE_GREEN;

    // Green pulse with Cyan wave
    const waveChar = '≋';
    const healthBar = `[${waveChar.repeat(Math.round(data.health * 10))}${'-'.repeat(10 - Math.round(data.health * 10))}]`;

    const width = 64;
    const top = h(`${BORDERS.tl}${BORDERS.h.repeat(width)}${BORDERS.tr}`);

    // Aesthetic Hybrid status indicators
    const statusIdx = ` ${h('●')} ${COLORS.HIGHLIGHT('SOVEREIGN HUD')} `;
    const projectInfo = ` PROJECT: ${y(data.projectName.padEnd(12))} `;
    const adminInfo = ` ADMIN: ${s(data.userName.padEnd(12))} `;

    const row1 = `${h(BORDERS.v)}${statusIdx}|${projectInfo}|${adminInfo}${h(BORDERS.v)}`;

    const agentIdx = ` AGENT: ${c(data.agentId.padEnd(12))} `;
    const healthIdx = ` HEALTH: ${p(healthBar)} `;
    const taskIdx = ` TASK: ${g((data.activeTask || 'HIVE_IDLE').padEnd(16))} `;

    const row2 = `${h(BORDERS.v)}${agentIdx}|${healthIdx}|${taskIdx}${h(BORDERS.v)}`;
    const bottom = h(`${BORDERS.bl}${BORDERS.h.repeat(width)}${BORDERS.br}`);

    return [top, row1, row2, bottom].join('\n');
  },
};
