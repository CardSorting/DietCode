/**
 * [LAYER: DOMAIN]
 * Principle: Pure interface for user interaction and display.
 * No external UI framework dependencies.
 */

export interface TerminalInterface {
  logClaude(text: string): void;
  logToolUse(name: string, input: any): void;
  logError(message: string): void;
  logUsage(command: string): void;
  promptUser(): Promise<string>;
  close(): void;
  clear(): void;
}
