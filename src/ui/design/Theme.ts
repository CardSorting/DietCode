import chalk from 'chalk';

export const COLORS = {
  PRIMARY: chalk.cyan,
  SECONDARY: chalk.gray,
  SUCCESS: chalk.green,
  ERROR: chalk.red,
  WARNING: chalk.yellow,
  HIGHLIGHT: chalk.white.bold,
  SOVEREIGN: chalk.cyan.bold,
  MUTED: chalk.gray,
};

export const ICONS = {
  SIMPLE: `
  .---.
 /     \\
|       |
|       |
 '---'
`,
  DIETCODE: `
  .---.
 /     \\
| [D|C] |
|       |
 '---'
`,
  PREMIUM: `
  .---.
 /  *  \\
| [S|H] |
|  ~~~  |
 '---'
`,
  MINI_CAN: '🥤',
  SODA_CAN: '🥫',
  CHECK: '✅',
  CROSS: '❌',
  LOADING: '⏳',
  DIAGNOSTIC: '🛠️',
  GEAR: '⚙️',
  BRAIN: '🧠',
  DATABASE: '🗄️',
  BEE: '🐝',
  TEMPLE: '🏛️',
};

export const BORDERS = {
  tl: '╭',
  tr: '╮',
  bl: '╰',
  br: '╯',
  h: '─',
  v: '│',
  ml: '├',
  mr: '┤',
  mt: '┬',
  mb: '┴',
  mm: '┼',
};
