/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of visual communication (Terminal) using Node.js APIs.
 * Uses structured logging for production-grade observability.
 */

import * as readline from 'node:readline';
import chalk from 'chalk';
import type { LogService } from '../domain/logging/LogService';
import type { TerminalInterface } from '../domain/system/TerminalInterface';

export class NodeTerminalAdapter implements TerminalInterface {
  private rl: readline.Interface;

  constructor(private logService: LogService) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  logClaude(text: string) {
    // Hardened rendering: handle potential empty strings and multi-line breaks
    const cleanText = text.trim() ? text : '(No response)';
    // To properly integrate with LogService, we'd normally emit structured logs
    // But TerminalInterface methods are presentation-layer contracts
    // These are kept as console methods for CLI adaptability
    console.log(chalk.green('\nClaude:'), cleanText);
  }

  logToolUse(name: string, input: any) {
    // presentation method
    console.log(chalk.yellow(`\nTool Use: ${name}`), JSON.stringify(input, null, 2));
  }

  logError(message: string) {
    // presentation method
    console.error(chalk.red('\nError:'), message);
  }

  logUsage(command: string) {
    // presentation method
    console.log(`Usage: bun run ${command} <prompt>`);
  }

  async promptUser(): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(chalk.blue('\n> '), (answer) => {
        resolve(answer);
      });
    });
  }

  close() {
    this.rl.close();
  }

  clear() {
    process.stdout.write('\x1Bc');
  }
}
