/**
 * [LAYER: UI]
 * Principle: Render state, dispatch intentions. Purely presentation.
 * Violations: Currently imports 'chalk' and 'readline' (Infrastructure concerns) - fixed via NodeTerminalAdapter.
 */

import type { TerminalInterface } from '../domain/system/TerminalInterface';

export class TerminalUI implements TerminalInterface {
  constructor(private adapter: TerminalInterface) {}

  logClaude(text: string) {
    this.adapter.logClaude(text);
  }

  logToolUse(name: string, input: any) {
    this.adapter.logToolUse(name, input);
  }

  logError(message: string) {
    this.adapter.logError(message);
  }

  logUsage(command: string) {
    this.adapter.logUsage(command);
  }

  async promptUser(): Promise<string> {
    return this.adapter.promptUser();
  }

  close() {
    this.adapter.close();
  }

  clear() {
    this.adapter.clear();
  }
}
