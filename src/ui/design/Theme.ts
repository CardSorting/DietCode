import chalk from 'chalk';

/**
 * [LAYER: DESIGN]
 * Sovereign Aether Design Tokens — Liquid Neon Extensions.
 */
export const COLORS = {
  // Matrix / Sovereign Core
  HIVE_GREEN: chalk.hex('#00ff41'),   // Matrix Green
  HIVE_CYAN: chalk.hex('#00f2ff'),    // Sovereign Cyan
  HIVE_GOLD: chalk.hex('#ffcc00'),    // Warning Gold
  
  // Vaporwave Aesthetic Core
  AESTHETIC_PINK: chalk.hex('#ff71ce'), 
  AESTHETIC_PURPLE: chalk.hex('#b967ff'),
  
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
    if (health < 0.3) return '!!';
    if (health < 0.6) return '≈';
    return '●';
  }
};

export const WAVEFORMS = {
  THOUGHT: '∿∼∽∿∼∽',
  SCAN: '░▒▓█▓▒░',
  HEARTBEAT: 'ﮩ٨ـﮩﮩ٨ـ',
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
  TELEMETRY: '📡',
};

export const AESTHETIC = {
  getLogo(profile: string): string {
    if (profile === 'MATRIX') return ICONS.MATRIX_LOGO;
    if (profile === 'VAPORWAVE') return ICONS.VAPOR_LOGO;
    return ICONS.DIETCODE;
  }
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
