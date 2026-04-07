/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure interface for user interaction and display.
 * No external UI framework dependencies.
 */

export interface HudData {
  agentId: string;
  projectName: string;
  userName: string;
  health: number; // 0.0 to 1.0
  activeTask?: string;
}

export interface TerminalInterface {
  logClaude(text: string): void;
  logToolUse(name: string, input: any): void;
  logError(message: string): void;
  logUsage(command: string): void;
  logSuccess(message: string): void;
  logInfo(message: string): void;
  renderHud(data: HudData): void;
  drawBox(title: string, content: string, color?: string): void;
  promptUser(query?: string): Promise<string>;
  promptSecret(query: string): Promise<string>;
  close(): void;
  clear(): void;
}
