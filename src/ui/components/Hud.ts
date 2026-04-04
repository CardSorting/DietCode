import type { HudData } from '../../domain/system/TerminalInterface';
import { HudRenderer } from '../renderers/HudRenderer';

/**
 * Structured UI component for the Sovereign HUD.
 */
export class Hud {
  /**
   * Renders the HUD using provided data.
   */
  public render(data: HudData): string {
    return HudRenderer.render(data);
  }
}
