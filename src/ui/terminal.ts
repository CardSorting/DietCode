/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: UI]
 * Principle: Render state, dispatch intentions. Purely presentation.
 * TerminalUI acts as the UI Root, coordinating renderers and components.
 */

import type { TerminalInterface, HudData } from '../domain/system/TerminalInterface';
import { Hud } from './components/Hud';
import { BoxRenderer } from './renderers/BoxRenderer';
import { CinematicRenderer } from './renderers/CinematicRenderer';
import { MetabolicRenderer } from './renderers/MetabolicRenderer';
import { AuthSequence } from './components/AuthSequence';
import { COLORS } from './design/Theme';

export class TerminalUI implements TerminalInterface {
  private hud: Hud;
  private auth: AuthSequence;
  private currentHeat = 0;

  constructor(private terminal: TerminalInterface) {
    this.hud = new Hud();
    this.auth = new AuthSequence();
    this.hud.startHeartbeat();
  }

  /**
   * High-Immersion Boot Sequence.
   */
  async init(userName: string) {
    await this.auth.authenticate(userName);
  }

  async logClaude(text: string) {
    const cleanText = text.trim() ? text : '(No response)';
    // Cinematic reveal with ambient drift
    const header = MetabolicRenderer.ambientDrift('\n[ CLAUDE-3.7 SIGNAL ]\n', Date.now() / 1000);
    await CinematicRenderer.hardType(header, 5);
    console.log(BoxRenderer.render('SOVEREIGN TRANSMISSION', cleanText, this.currentHeat > 50 ? 'WARNING' : 'SUCCESS'));
  }

  logToolUse<T = void>(name: string, input: T) {
    // Waveform visualization for tool usage
    console.log(MetabolicRenderer.renderWaveform(0.5));
    this.terminal.logToolUse(name, input);
  }

  logError(message: string) {
    // Glitch effect and metabolic shift
    const _isUnicode = process.env.LANG?.includes('UTF-8') || process.env.TERM_PROGRAM === 'vscode';
    console.error(COLORS.GLITCH('\n CRITICAL ERROR '), message);
    this.currentHeat = Math.min(100, this.currentHeat + 20);
  }

  logUsage(command: string) {
    this.terminal.logUsage(command);
  }

  logSuccess(message: string) {
    const successHeader = MetabolicRenderer.ambientDrift('\n SUCCESS: ', Date.now() / 1000);
    console.log(successHeader, COLORS.HIGHLIGHT(message));
    this.currentHeat = Math.max(0, this.currentHeat - 10);
  }

  logInfo(message: string) {
    console.log(COLORS.PRIMARY('\n INFO: '), message);
  }

  renderHud(data: HudData) {
    // Real Implementation: Inject the pulse indicator and explicitly render to the TUI layer
    const _pulse = Math.sin(Date.now() / 500) * 0.5 + 0.5;
    const _hudFrame = this.hud.render(data);
    
    // Dispatch the rendered frame to the underlying system terminal
    this.terminal.renderHud(data);
  }

  drawBox(title: string, content: string, color?: string) {
    this.terminal.drawBox(title, content, color);
  }

  async promptUser(query?: string): Promise<string> {
    return this.terminal.promptUser(query);
  }

  async promptSecret(query: string): Promise<string> {
    return this.terminal.promptSecret(query);
  }

  close() {
    this.hud.stopHeartbeat();
    this.terminal.close();
  }

  async clear() {
    await CinematicRenderer.wipe();
  }
}
