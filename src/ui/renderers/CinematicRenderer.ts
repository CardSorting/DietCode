/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { COLORS, ICONS, SYMBOLS, supportsUnicode } from '../design/Theme';

/**
 * [LAYER: RENDERER]
 * Sovereign Aether Hybrid Cinematic terminal animations — Zenith Edition.
 */
export const CinematicRenderer = {
  /**
   * High-speed character reveal for diagnostic logs.
   */
  async hardType(text: string, speed = 2): Promise<void> {
    for (const char of text) {
      if (char) process.stdout.write(char);
      if (speed > 0) await new Promise(r => setTimeout(r, speed));
    }
    process.stdout.write('\n');
  },

  /**
   * Kinetic Reveal: A spring-eased reveal where text "bounces" into position.
   */
  async kineticReveal(lines: string[]): Promise<void> {
    for (const line of lines) {
      // Simulation of a bounce: Reveal at a slight offset then snap back 
      process.stdout.write(`  ${COLORS.AESTHETIC_PINK(line)}`); 
      await new Promise(r => setTimeout(r, 40));
      process.stdout.write(`\r${line}\n`);
      await new Promise(r => setTimeout(r, 60));
    }
  },

  /**
   * Blur Type: A typewriter effect that alternates spectrum colors to simulate motion blur.
   */
  async blurType(text: string, speed = 25): Promise<void> {
    const colors = [COLORS.HIVE_GREEN, COLORS.AESTHETIC_PINK, COLORS.HIGHLIGHT];
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (!char) continue;
        
        const c0 = colors[0];
        const c1 = colors[1];
        const c2 = colors[2];

        if (c0 && c1 && c2) {
          process.stdout.write(c0(char));
          await new Promise(r => setTimeout(r, speed / 3));
          process.stdout.write(`\b${c1(char)}`);
          await new Promise(r => setTimeout(r, speed / 3));
          process.stdout.write(`\b${c2(char)}`);
          await new Promise(r => setTimeout(r, speed / 3));
        }
    }
    process.stdout.write('\n');
  },

  /**
   * Narrative typewriter with easing for agent thoughts.
   */
  async smoothFlow(text: string, baseSpeed = 12): Promise<void> {
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const progress = i / text.length;
      const speed = baseSpeed * (1 + Math.sin(progress * Math.PI));
      if (char) process.stdout.write(char);
      await new Promise(r => setTimeout(r, speed));
    }
    process.stdout.write('\n');
  },

  /**
   * Diagnostic scan that transmutates from Green to Shimmering White.
   */
  async hybridReveal(lines: string[], scanColor = COLORS.HIVE_GREEN): Promise<void> {
    for (const line of lines) {
      process.stdout.write(scanColor(`[SCAN]: ${line}`));
      await new Promise(r => setTimeout(r, 30));
      process.stdout.write(`\r${line}\n`);
      await new Promise(r => setTimeout(r, 50));
    }
  },

  /**
   * Vapor styling typewriter.
   */
  async vaporType(text: string, speed = 20): Promise<void> {
     const colors = [COLORS.AESTHETIC_PINK, COLORS.HIVE_CYAN, COLORS.AESTHETIC_PURPLE];
     for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const color = colors[i % colors.length];
        if (color) {
          process.stdout.write(color(char));
        }
        await new Promise(r => setTimeout(r, speed));
     }
     process.stdout.write('\n');
  },

  /**
   * Shimmer Reveal: Reveals lines with a sliding Liquid Neon shimmer effect.
   */
  async shimmerReveal(lines: string[], cycles = 1): Promise<void> {
    for (const line of lines) {
      for (let c = 0; c < cycles; c++) {
        for (let offset = -5; offset < line.length + 5; offset++) {
          process.stdout.write(`\r${COLORS.applyRainbowShimmer(line, offset / line.length)}`);
          await new Promise(r => setTimeout(r, 20));
        }
      }
      process.stdout.write('\n');
    }
  },

  /**
   * Simple reveal of multiple lines with delay.
   */
  async revealLines(lines: string[], delay = 50): Promise<void> {
    for (const line of lines) {
      console.log(line);
      if (delay > 0) await new Promise(r => setTimeout(r, delay));
    }
  },

  /**
   * Universal terminal reset and cursor home.
   */
  async wipe(): Promise<void> {
    process.stdout.write('\x1b[2J\x1b[H');
  },

  /**
   * Glitches a line of text by briefly replacing characters with noise.
   */
  async glitchLine(text: string, count = 5): Promise<void> {
    const glitchChars = ICONS.GLITCH_CHARS;
    const original = text;
    for (let i = 0; i < count; i++) {
        const glitched = text.split('').map(c => Math.random() > 0.8 ? glitchChars[Math.floor(Math.random() * glitchChars.length)] : c).join('');
        process.stdout.write(`\r${COLORS.HIVE_GREEN(glitched)}`);
        await new Promise(r => setTimeout(r, 40));
    }
    process.stdout.write(`\r${original}\n`);
  },

  /**
   * Renders a "Scanning" bar across the width of the terminal.
   */
  async scanline(height = 5): Promise<void> {
    const width = process.stdout.columns || 80;
    const bar = SYMBOLS.FULL_BLOCK.repeat(width);
    for (let i = 0; i < height; i++) {
        process.stdout.write(`\r${COLORS.HIVE_CYAN(bar)}`);
        await new Promise(r => setTimeout(r, 50));
        process.stdout.write(`\r${' '.repeat(width)}`);
        await new Promise(r => setTimeout(r, 20));
    }
  },

  /**
   * Simulates a high-speed data burst with flickering characters across multiple lines.
   */
  async dataBurst(lines = 3): Promise<void> {
    const isUnicode = supportsUnicode();
    const width = process.stdout.columns || 80;
    const chars = ICONS.GLITCH_CHARS;
    for (let i = 0; i < 8; i++) {
        let block = '';
        for (let l = 0; l < lines; l++) {
            block += `${COLORS.MUTED(Array(width).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join(''))}\n`;
        }
        process.stdout.write(block);
        await new Promise(r => setTimeout(r, 10));
        process.stdout.write(`\x1b[${lines}A`); // Move back up
    }
    // Clear block
    for (let l = 0; l < lines; l++) {
        process.stdout.write(`${' '.repeat(width)}\n`);
    }
    process.stdout.write(`\x1b[${lines}A`);
  },

  /**
   * A vivid, multi-color horizontal wipe that resets the aesthetic.
   */
  async neonWipe(): Promise<void> {
    const width = process.stdout.columns || 80;
    const bar = SYMBOLS.FULL_BLOCK.repeat(width);
    const colors = [COLORS.AESTHETIC_PINK, COLORS.HIVE_CYAN, COLORS.AESTHETIC_PURPLE];
    
    for (const color of colors) {
        process.stdout.write(`\r${color(bar)}`);
        await new Promise(r => setTimeout(r, 20));
    }
    process.stdout.write(`\r${' '.repeat(width)}\r`);
  },

  /**
   * Pulses a line of text with varying intensity.
   */
  async pulseText(text: string, cycles = 1): Promise<void> {
    for (let c = 0; c < cycles; c++) {
        process.stdout.write(`\r${COLORS.HIGHLIGHT(text)}`);
        await new Promise(r => setTimeout(r, 80));
        process.stdout.write(`\r${COLORS.MUTED(text)}`);
        await new Promise(r => setTimeout(r, 80));
    }
    process.stdout.write(`\r${COLORS.SUCCESS(text)}\n`);
  }
};
