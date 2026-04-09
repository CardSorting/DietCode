/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { BORDERS, COLORS } from '../design/Theme';

/**
 * Pure layout function for rendering a structured box with a title and content.
 */
export const BoxRenderer = {
  render(title: string, content: string, color = 'cyan'): string {
    const c = (COLORS as any)[color.toUpperCase()] || COLORS.PRIMARY;
    const lines = content.split('\n');
    const width = Math.max(title.length, ...lines.map((l) => l.length)) + 4;

    const top = c(
      `${BORDERS.tl}${BORDERS.h} ${title} ${BORDERS.h.repeat(width - title.length - 3)}${BORDERS.tr}`,
    );
    const middle = lines.map((l) => `${c(BORDERS.v)} ${l.padEnd(width - 2)} ${c(BORDERS.v)}`);
    const bottom = c(`${BORDERS.bl}${BORDERS.h.repeat(width)}${BORDERS.br}`);

    return [top, ...middle, bottom].join('\n');
  },
};
