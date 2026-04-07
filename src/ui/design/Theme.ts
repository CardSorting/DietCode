/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import chalk from 'chalk';

/**
 * [LAYER: DESIGN]
 * Sovereign Aether Design Tokens — Liquid Neon Extensions.
 */
export const supportsUnicode = (): boolean => {
  // Manual override takes priority
  if (process.env.DIETCODE_NO_UNICODE === 'true') return false;
  if (process.env.DIETCODE_FORCE_UNICODE === 'true') return true;
  
  // Strict Locale Check: Only return true if the environment explicitly claims UTF-8 support
  const hasUnicodeEnv = /UTF-8/i.test(process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG || '');
  if (hasUnicodeEnv) return true;

  // Fallback ONLY for modern terminal systems known to be UTF-8 by default regardless of LANG
  return !!(
    process.env.WT_SESSION || // Windows Terminal
    process.env.TERMINUS_SUBLIME ||
    process.env.TERM_PROGRAM === 'vscode'
  );
};

export const SYMBOLS = {
  get HEARBEAT() { return supportsUnicode() ? 'ﮩ٨ـﮩﮩ٨ـ' : '-^-v-^'; },
  get WAVE() { return supportsUnicode() ? '∿∼∽∿∼∽' : '~~~~~~'; },
  get SCAN_BLOCK() { return supportsUnicode() ? '░▒▓█▓▒░' : '[#####]'; },
  get GHOST_CHARS() { return supportsUnicode() ? '░▒▓█' : '#=- '; },
  get FULL_BLOCK() { return supportsUnicode() ? '█' : '#'; },
  get EMPTY_BLOCK() { return supportsUnicode() ? '░' : '.'; },
  get SPARK() { return supportsUnicode() ? '⚡' : '>'; },
  get GLITCH_CHARS() { return '01#@$%&*!?'; },
  get DATA_BLOCK() { return supportsUnicode() ? '▓▒░' : '###'; },
  get CIRCLE() { return supportsUnicode() ? '◌◍◎◑◐○◌' : 'oO0OoO.'; },
  getSpark(progress: number): string {
    const isUnicode = supportsUnicode();
    if (isUnicode) return '⚡';
    // Kinetic ASCII Shimmer: '>' moves as the bar fills
    return progress > 0.9 ? '!' : '>';
  }
};

export const COLORS = {
  // Matrix / Sovereign Core
  HIVE_GREEN: chalk.hex('#00ff41'),   // Matrix Green
  HIVE_CYAN: chalk.hex('#00f2ff'),    // Sovereign Cyan
  HIVE_GOLD: chalk.hex('#ffcc00'),    // Warning Gold
  
  // Vaporwave Aesthetic Core
  AESTHETIC_PINK: chalk.hex('#ff71ce'), 
  AESTHETIC_PURPLE: chalk.hex('#b967ff'),
  NEON_CYAN: chalk.hex('#00f2ff'),
  NEON_PINK: chalk.hex('#ff71ce'),
  SOFT_PURPLE: chalk.hex('#b967ff'),
  
  // Aesthetic Profiles
  PROFILES: {
    AETHER: { primary: '#00f2ff', highlight: '#ffffff' },
    MATRIX: { primary: '#00ff41', highlight: '#00ff41' },
    VAPORWAVE: { primary: '#ff71ce', highlight: '#b967ff' },
    INDUSTRIAL: { primary: '#abb2bf', highlight: '#e06c75' }
  },

  activeProfile: 'AETHER',

  get PRIMARY() {
    const p = (this as any).PROFILES[(this as any).activeProfile] || (this as any).PROFILES.AETHER;
    return chalk.hex(p.primary);
  },

  get HIGHLIGHT() {
    const p = (this as any).PROFILES[(this as any).activeProfile] || (this as any).PROFILES.AETHER;
    return chalk.hex(p.highlight).bold;
  },

  get SOVEREIGN() {
    return this.activeProfile === 'VAPORWAVE' ? this.AESTHETIC_PURPLE.bold : this.HIVE_CYAN.bold;
  },

  // Base Sovereign Tokens
  SECONDARY: chalk.hex('#3e4451'),
  SUCCESS: chalk.hex('#00ff41'),
  ERROR: chalk.hex('#ff0033'),
  WARNING: chalk.hex('#ffcc00'),
  MUTED: chalk.hex('#282c34'),

  // Semantic UI Tokens
  GLITCH: (text: string) => chalk.bgHex('#ff0033').hex('#ffffff')(text),
  PULSE: chalk.hex('#00ff41'), 
  SHIMMER: chalk.hex('#ffffff').italic,
  AETHER: chalk.hex('#ff71ce').italic,
  HEATPULSE: (text: string, heat: number) => {
    const color = heat > 80 ? chalk.hex('#ff0033') : heat > 50 ? chalk.hex('#ffcc00') : chalk.hex('#00ff41');
    return color(text);
  },

  /**
   * RGB LERP Utility.
   */
  lerpRgb(hexA: string, hexB: string, factor: number): { r: number, g: number, b: number } {
    const hexToRgb = (hex: string) => {
      const r = Number.parseInt(hex.slice(1, 3), 16);
      const g = Number.parseInt(hex.slice(3, 5), 16);
      const b = Number.parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };
    const rgbA = hexToRgb(hexA);
    const rgbB = hexToRgb(hexB);
    return {
      r: Math.round(rgbA.r + (rgbB.r - rgbA.r) * factor),
      g: Math.round(rgbA.g + (rgbB.g - rgbA.g) * factor),
      b: Math.round(rgbA.b + (rgbB.b - rgbA.b) * factor)
    };
  },

  /**
   * Sovereign Rainbow Spectrum (Liquid Neon).
   * Blends Green -> Cyan -> Pink -> Purple -> White (Shimmer) -> Green.
   */
  getRainbowColor(factor: number): { r: number, g: number, b: number } {
     const stops = ['#00ff41', '#00f2ff', '#ff71ce', '#b967ff', '#ffffff', '#00ff41'];
     const n = stops.length - 1;
     const scaledFactor = (factor % 1) * n;
     const i = Math.floor(scaledFactor);
     const f = scaledFactor - i;
     const stopA = stops[i] as string;
     const stopB = (stops[i + 1] ?? stops[stops.length - 1]) as string;
     return (this as any).lerpRgb(stopA, stopB, f);
  },

  /**
   * Applies the Liquid Neon shimmer.
   */
  applyRainbowShimmer(text: string, offset: number): string {
    return text.split('').map((char, i) => {
      const factor = (i / text.length + offset) % 1;
      const rgb = this.getRainbowColor(factor);
      return chalk.rgb(rgb.r, rgb.g, rgb.b)(char);
    }).join('');
  },

  /**
   * Sliding Shine (Previous effect, kept for compatibility).
   */
  applyShimmer(text: string, offset: number, baseHex: string, shineHex = '#ffffff'): string {
    const rgbBase = {
      r: Number.parseInt(baseHex.slice(1, 3), 16),
      g: Number.parseInt(baseHex.slice(3, 5), 16),
      b: Number.parseInt(baseHex.slice(5, 7), 16)
    };
    const rgbShine = {
      r: Number.parseInt(shineHex.slice(1, 3), 16),
      g: Number.parseInt(shineHex.slice(3, 5), 16),
      b: Number.parseInt(shineHex.slice(5, 7), 16)
    };
    return text.split('').map((char, i) => {
      const dist = Math.abs(i - offset);
      const intensity = Math.max(0, 1 - dist / 5);
      const r = Math.round(rgbBase.r + (rgbShine.r - rgbBase.r) * intensity);
      const g = Math.round(rgbBase.g + (rgbShine.g - rgbBase.g) * intensity);
      const b = Math.round(rgbBase.b + (rgbShine.b - rgbBase.b) * intensity);
      return chalk.rgb(r, g, b)(char);
    }).join('');
  }
};

/**
 * Procedural color shifting for Sovereign Aether Spectrum.
 */
export const METABOLIC_MODIFIERS = {
  getPrimaryByHeat(heat: number): chalk.Chalk {
    // heat 0-100. Shift from Green (Stable) to Cyan (Active) to Pink (Deep Hive) to Red (Critical).
    if (heat > 85) return chalk.hex('#ff0033').bold;
    if (heat > 60) return chalk.hex('#ff71ce');
    if (heat > 30) return chalk.hex('#00f2ff');
    return chalk.hex('#00ff41');
  },
  getPrimaryHexByHeat(heat: number): string {
    if (heat > 85) return '#ff0033';
    if (heat > 60) return '#ff71ce';
    if (heat > 30) return '#00f2ff';
    return '#00ff41';
  },
  getPulseIntensity(health: number): string {
    const isUnicode = supportsUnicode();
    if (health < 0.3) return '!!';
    if (health < 0.6) return isUnicode ? '≈' : '~~';
    return isUnicode ? '●' : '(*)';
  }
};

export const WAVEFORMS = {
  get THOUGHT() { return SYMBOLS.WAVE; },
  get SCAN() { return SYMBOLS.SCAN_BLOCK; },
  get HEARTBEAT() { return SYMBOLS.HEARBEAT; },
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
 /     \\   DIETCODE
| [D|C] |   [ SOVEREIGN HIVE ARCHITECTURE ]
|       |   v2.0.0
 '---'
`,
  MATRIX_LOGO: `
  [0|1]
 / 0 1 \\   SOVEREIGN_MATRIX
|  1 0  |  [ PROTOCOL_LOCKED ]
 \\ 1 0 /
  [1|0]
`,
  VAPOR_LOGO: `
  * . *
 / ~ ~ \\   AESTHETIC_HIVE
|  [V|P] |  [ PINK_DREAMSTATE ]
 \\ ~ ~ /
  * . *
`,
  PREMIUM: `
  .---.
 /  *  \\
| [S|H] |
|  ~~~  |
 '---'
`,
  get MINI_CAN() { return supportsUnicode() ? '🥤' : '(CAN)'; },
  get SODA_CAN() { return supportsUnicode() ? '🥫' : '(🥫)'; },
  get CHECK() { return supportsUnicode() ? '✅' : '[OK]'; },
  get CROSS() { return supportsUnicode() ? '❌' : '[FAIL]'; },
  get LOADING() { return supportsUnicode() ? '⏳' : '(WAIT)'; },
  get DIAGNOSTIC() { return supportsUnicode() ? '🛠️' : '(TOOL)'; },
  get GEAR() { return supportsUnicode() ? '⚙️' : '(GEAR)'; },
  get BRAIN() { return supportsUnicode() ? '🧠' : '(BRAIN)'; },
  get DATABASE() { return supportsUnicode() ? '🗄️' : '(DB)'; },
  get BEE() { return supportsUnicode() ? '🐝' : '(SWARM)'; },
  get TEMPLE() { return supportsUnicode() ? '🏛️' : '(GUARD)'; },
  get TELEMETRY() { return supportsUnicode() ? '📡' : '(LINK)'; },
  get CINEMATIC_LOGO() {
    if (supportsUnicode()) {
      const b = SYMBOLS.FULL_BLOCK;
      return `
 ${b}${b}${b}${b}${b}${b}╗ ██╗███████╗████████╗ ██████╗  ██████╗ ██████╗ ███████╗
 ${b}${b}╔══${b}${b}╗██║██╔════╝╚══██╔══╝██╔════╝ ██╔═══██╗██╔══██╗██╔════╝
 ${b}${b}║  ${b}${b}║██║█████╗     ██║   ██║      ██║   ██║██║  ██║█████╗  
 ${b}${b}║  ${b}${b}║██║██╔══╝     ██║   ██║      ██║   ██║██║  ██║██╔══╝  
 ${b}${b}${b}${b}${b}${b}╔╝██║███████╗   ██║   ╚██████╗ ╚██████╔╝██████╔╝███████╗
 ╚═════╝ ╚═╝╚══════╝   ╚═╝    ╚═════╝  ╚═════╝ ╚═════╝ ╚══════╝
`;
    }
    return `
 DIETCODE [ SOVEREIGN HIVE ARCHITECTURE ]
 [ CORE INTEGRITY SYSTEM ]
`;
  },
  get GLITCH_CHARS() { return SYMBOLS.GLITCH_CHARS; },
  get DATA_BLOCK() { return SYMBOLS.DATA_BLOCK; },
  get PULSE_WAVE() { return SYMBOLS.WAVE; },
  get DREAM_CIRCLE() { return SYMBOLS.CIRCLE; },
};

export const AESTHETIC = {
  getLogo(profile: string): string {
    if (profile === 'MATRIX') return ICONS.MATRIX_LOGO;
    if (profile === 'VAPORWAVE') return ICONS.VAPOR_LOGO;
    return ICONS.DIETCODE;
  }
};

export const BORDERS = {
  get tl() { return supportsUnicode() ? '╭' : '+'; },
  get tr() { return supportsUnicode() ? '╮' : '+'; },
  get bl() { return supportsUnicode() ? '╰' : '+'; },
  get br() { return supportsUnicode() ? '╯' : '+'; },
  get h() { return supportsUnicode() ? '─' : '-'; },
  get v() { return supportsUnicode() ? '│' : '|'; },
  get ml() { return supportsUnicode() ? '├' : '+'; },
  get mr() { return supportsUnicode() ? '┤' : '+'; },
  get mt() { return supportsUnicode() ? '┬' : '+'; },
  get mb() { return supportsUnicode() ? '┴' : '+'; },
  get mm() { return supportsUnicode() ? '┼' : '+'; },
};
