import { COLORS } from '../design/Theme';

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
   * Shutter wipe of the console.
   */
  async wipe(): Promise<void> {
    const height = process.stdout.rows || 20;
    for (let i = 0; i < height; i++) {
      process.stdout.write('\n');
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    process.stdout.write('\x1Bc'); 
  }
};
