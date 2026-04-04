/**
 * [LAYER: UI]
 * Principle: Render state, dispatch intentions. Purely presentation.
 * TerminalUI acts as the UI Root, coordinating renderers and components.
 */

import type { TerminalInterface, HudData } from '../domain/system/TerminalInterface';
import { Hud } from './components/Hud';
import { BoxRenderer } from './renderers/BoxRenderer';

export class TerminalUI implements TerminalInterface {
  private hud: Hud;

  constructor(private terminal: TerminalInterface) {
    this.hud = new Hud();
  }

  logClaude(text: string) {
    this.terminal.logClaude(text);
  }

  logToolUse<T = void>(name: string, input: T) {
    this.terminal.logToolUse(name, input);
  }

  logError(message: string) {
    this.terminal.logError(message);
  }

  logUsage(command: string) {
    this.terminal.logUsage(command);
  }

  logSuccess(message: string) {
    this.terminal.logSuccess(message);
  }

  logInfo(message: string) {
    this.terminal.logInfo(message);
  }

  renderHud(data: HudData) {
    const rendered = this.hud.render(data);
    this.terminal.renderHud(data); // Legacy delegating for now, or we could pass the string if the interface supported it.
    // Actually, TerminalInterface.renderHud(data: HudData) usually means it handles the rendering.
    // But TerminalUI is a wrapper. If we want TerminalUI to be the "Root", it should probably handle the string generation.
    // Let's assume the underlying terminal (adapter) handles the actual I/O.
  }

  drawBox(title: string, content: string, color?: string) {
    // TerminalUI can now use BoxRenderer directly if it wants to "compose" things,
    // but typically it delegates I/O to the adapter.
    this.terminal.drawBox(title, content, color);
  }

  async promptUser(query?: string): Promise<string> {
    return this.terminal.promptUser(query);
  }

  async promptSecret(query: string): Promise<string> {
    return this.terminal.promptSecret(query);
  }

  close() {
    this.terminal.close();
  }

  clear() {
    this.terminal.clear();
  }
}
