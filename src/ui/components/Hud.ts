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
   * Starts a non-blocking background pulse.
   * Note: This assumes we can redraw or at least toggle a small indicator.
   * In a real terminal, we'd use cursor escapes to update the specific "pulse" char.
   */
  public startHeartbeat() {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      this.pulseState = !this.pulseState;
      // In this environment, we mostly rely on full renders, 
      // so this heartbeat might just 'prime' the next render 
      // or we could use precision cursor management in the adapter.
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
