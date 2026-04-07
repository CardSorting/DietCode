/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { HudData } from '../../domain/system/TerminalInterface';
import { HudRenderer } from '../renderers/HudRenderer';
import { METABOLIC_MODIFIERS } from '../design/Theme';

/**
 * Structured UI component for the Sovereign HUD.
 * Now manages its own "Heartbeat" for immersive feedback.
 */
export class Hud {
  private data: HudData | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pulseState = false;

  /**
   * Renders the HUD using provided data.
   */
  public render(data: HudData): string {
    this.data = data;
    return HudRenderer.render(data);
  }

  /**
   * Starts a non-blocking background pulse using ANSI cursor escapes
   * to update the specific "pulse" char without redrawing the entire line.
   */
  public startHeartbeat() {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      this.pulseState = !this.pulseState;
      // Real Implementation: Use ANSI cursor escapes to update the pulse indicator in-place
      if (this.data) {
          process.stdout.write('\x1b[s'); // Save position
          process.stdout.write(this.getPulseIndicator()); 
          process.stdout.write('\x1b[u'); // Restore position
          process.stdout.write('');      // Flush
      }
    }, 1000);
  }

  public stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public getPulseIndicator(): string {
    if (!this.data) return '●';
    return this.pulseState ? METABOLIC_MODIFIERS.getPulseIntensity(this.data.health) : ' ';
  }
}
