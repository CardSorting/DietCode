/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { COLORS, METABOLIC_MODIFIERS, SYMBOLS, WAVEFORMS } from '../design/Theme';

/**
 * [LAYER: RENDERER]
 * Sovereign Aether Hybrid metabolic protocols — Matrix Edition.
 */
export const MetabolicRenderer = {
  /**
   * High-intensity "Sovereign Glitch": Sharp, Matrix-like flickering that settles into primary.
   */
  async sovereignGlitch(text: string, duration = 400): Promise<void> {
    const chars = '01#@$%&*!?';
    const original = text;
    for (let i = 0; i < 3; i++) {
      const glitched = text
        .split('')
        .map((c) => (Math.random() > 0.6 ? chars[Math.floor(Math.random() * chars.length)] : c))
        .join('');
      process.stdout.write(`\r${COLORS.HIVE_GREEN(glitched)}`);
      await new Promise((r) => setTimeout(r, duration / 6));
    }
    process.stdout.write(`\r${COLORS.AESTHETIC_PINK(original)}`);
    await new Promise((r) => setTimeout(r, duration / 2));
    process.stdout.write('\n');
  },

  /**
   * Matrix Convergence: A cascading character-locking reveal.
   * Characters "rain" as Green symbols and independently "snap" into the final state.
   */
  async matrixReveal(text: string, finalColor: (t: string) => string, speed = 40): Promise<void> {
    const symbols = '01#@$%&*!?';
    const locked = Array(text.length).fill(false);
    let lockedCount = 0;

    // We proceed until all characters are locked
    while (lockedCount < text.length) {
      // Randomly pick N characters to lock in each step to create a "raining" flow
      const toLock = Math.max(1, Math.floor(Math.random() * 3));
      for (let i = 0; i < toLock; i++) {
        const idx = Math.floor(Math.random() * text.length);
        if (!locked[idx]) {
          locked[idx] = true;
          lockedCount++;
        }
      }

      // Render Current Frame
      const frame = text
        .split('')
        .map((char, i) => {
          if (locked[i]) {
            // Locked characters use final color
            return finalColor(char);
          }
          // Raining characters flip rapidly
          const s = symbols[Math.floor(Math.random() * symbols.length)];
          return COLORS.HIVE_GREEN(s);
        })
        .join('');

      process.stdout.write(`\r${frame}`);
      await new Promise((r) => setTimeout(r, speed));
    }
    process.stdout.write('\n');
  },

  /**
   * Zenith Storm: A chaotic burst featuring motion-trailing (ghosts) and multi-axis shifts.
   */
  async zenithStorm(text: string, duration = 600): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < duration) {
      const shift = Math.floor(Math.random() * 8) - 4;
      const ghostChars = SYMBOLS.GHOST_CHARS;
      const ghostText = text
        .split('')
        .map((c) =>
          Math.random() > 0.7 ? ghostChars[Math.floor(Math.random() * ghostChars.length)] : c,
        )
        .join('');
      const color = Math.random() > 0.5 ? COLORS.HIVE_GREEN : COLORS.AESTHETIC_PINK;
      process.stdout.write(`\r${' '.repeat(Math.abs(shift))}${COLORS.MUTED(ghostText)}`);
      await new Promise((r) => setTimeout(r, 20));
      process.stdout.write(`\r${' '.repeat(Math.abs(shift))}${color(text)}`);
      await new Promise((r) => setTimeout(r, 30));
    }
    process.stdout.write(`\r${COLORS.AESTHETIC_PURPLE(text)}\n`);
  },

  /**
   * Ambient Drift: Subtle, periodic color-shift to keep the UI "breathing".
   */
  ambientDrift(text: string, factor = 0): string {
    const rgb = COLORS.getRainbowColor(factor % 1);
    const colored = (char: string) => `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m${char}\x1b[0m`;
    return text.split('').map(colored).join('');
  },

  /**
   * Axiom Scan: Fast-scrolling simulated memory hex addresses.
   */
  async axiomScan(count = 20): Promise<void> {
    for (let i = 0; i < count; i++) {
      const addr = `0x${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
      const val = Math.random().toString(16).slice(2, 6).toUpperCase();
      process.stdout.write(COLORS.HIVE_GREEN(`[AXIOM_SCAN]: ADDR:${addr} -> VAL:${val} [OK]\n`));
      await new Promise((r) => setTimeout(r, 15));
    }
  },

  /**
   * Aesthetic "Aether Glitch": Subtle, dreamy distortion.
   */
  async aetherGlitch(text: string, duration = 300): Promise<void> {
    const symbols = SYMBOLS.CIRCLE;
    process.stdout.write(
      `\r${COLORS.AESTHETIC_PINK(
        text
          .split('')
          .map((c) =>
            Math.random() > 0.8 ? symbols[Math.floor(Math.random() * symbols.length)] : c,
          )
          .join(''),
      )}`,
    );
    await new Promise((r) => setTimeout(r, duration / 2));
    process.stdout.write(`\r${COLORS.HIVE_CYAN(text)}`);
    await new Promise((r) => setTimeout(r, duration / 2));
    process.stdout.write('\n');
  },

  renderWaveform(intensity: number): string {
    const wave = WAVEFORMS.THOUGHT;
    const color = intensity > 0.7 ? COLORS.AESTHETIC_PINK : COLORS.HIVE_GREEN;
    return color(wave.repeat(5));
  },

  async decrypt(text: string, speed = 20): Promise<void> {
    const chars = '01#@$%';
    const display = Array(text.length).fill(' ');
    for (let i = 0; i < text.length; i++) {
      display[i] = chars[Math.floor(Math.random() * chars.length)];
      process.stdout.write(`\r${COLORS.HIVE_GREEN(display.join(''))}`);
      await new Promise((r) => setTimeout(r, speed / 4));
      display[i] = text[i];
      process.stdout.write(`\r${COLORS.HIVE_CYAN(display.join(''))}`);
    }
    process.stdout.write('\n');
  },

  getMetabolicStyle(heat: number): (text: string) => string {
    const c = METABOLIC_MODIFIERS.getPrimaryByHeat(heat);
    return (t: string) => c(t);
  },

  async heatPulse(text: string, heat: number, cycles = 3): Promise<void> {
    for (let i = 0; i < cycles; i++) {
      process.stdout.write(`\r${COLORS.HEATPULSE(text, heat)}`);
      await new Promise((r) => setTimeout(r, 200));
      process.stdout.write(`\r${COLORS.PRIMARY(text)}`);
      await new Promise((r) => setTimeout(r, 200));
    }
    process.stdout.write('\n');
  },

  async shimmerPulse(text: string, heat: number, cycles = 2): Promise<void> {
    const baseHex = METABOLIC_MODIFIERS.getPrimaryHexByHeat(heat);
    const shineHex = heat > 80 ? '#ffffff' : '#ccffff';
    for (let c = 0; c < cycles; c++) {
      for (let offset = -5; offset < text.length + 5; offset++) {
        const shimmered = COLORS.applyShimmer(text, offset, baseHex, shineHex);
        process.stdout.write(`\r${shimmered}`);
        await new Promise((r) => setTimeout(r, 30));
      }
    }
    process.stdout.write('\n');
  },

  async rainbowPulse(text: string, cycles = 3): Promise<void> {
    for (let c = 0; c < cycles; c++) {
      for (let offset = 0; offset < 1.0; offset += 0.005) {
        const rainbow = COLORS.applyRainbowShimmer(text, offset);
        process.stdout.write(`\r${rainbow}`);
        await new Promise((r) => setTimeout(r, 20));
      }
    }
    process.stdout.write('\n');
  },

  /**
   * Data Burst: Sharp, multi-line telemetry simulation.
   */
  async dataBurst(lines: string[], speed = 10): Promise<void> {
    for (const line of lines) {
      const g = Math.random().toString(16).slice(2, 6).toUpperCase();
      const addr = `0x${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
      const color = Math.random() > 0.5 ? COLORS.HIVE_CYAN : COLORS.AESTHETIC_PINK;

      process.stdout.write(
        `${COLORS.MUTED(`[DATA_${g}]`)} ${COLORS.PRIMARY(addr)} >> ${color(line)}\n`,
      );
      await new Promise((r) => setTimeout(r, speed));
    }
  },
};
