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

  logToolUse<T = void>(name: string, input: T) {
    this.adapter.logToolUse(name, input);
  }

  logError(message: string) {
    this.adapter.logError(message);
  }

  logUsage(command: string) {
    this.adapter.logUsage(command);
  }

  logSuccess(message: string) {
    this.adapter.logSuccess(message);
  }

  logInfo(message: string) {
    this.adapter.logInfo(message);
  }

  async promptUser(query?: string): Promise<string> {
    return this.adapter.promptUser(query);
  }

  async promptSecret(query: string): Promise<string> {
    return this.adapter.promptSecret(query);
  }

  close() {
    this.adapter.close();
  }

  clear() {
    this.adapter.clear();
  }
}
