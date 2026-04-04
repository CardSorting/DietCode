/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of visual communication (Terminal) using Node.js APIs.
 * Uses structured logging for production-grade observability.
 */

import * as readline from 'node:readline';
import { Writable } from 'node:stream';
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

  logSuccess(message: string) {
    console.log(chalk.green('\nSuccess:'), message);
  }

  logInfo(message: string) {
    console.log(chalk.cyan('\nInfo:'), message);
  }

  logUsage(command: string) {
    // presentation method
    console.log(`Usage: bun run ${command} <prompt>`);
  }

  async promptUser(query = '> '): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(chalk.blue(`\n${query}`), (answer) => {
        resolve(answer);
      });
    });
  }

  async promptSecret(query: string): Promise<string> {
    const mutableOutput = new Writable({
      write(chunk, encoding, callback) {
        if (!(this as any).muted) {
          process.stdout.write(chunk, encoding);
        }
        callback();
      },
    });
    (mutableOutput as any).muted = false;

    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: mutableOutput,
        terminal: true,
      });

      process.stdout.write(chalk.blue(`\n${query}`));
      (mutableOutput as any).muted = true;

      rl.question('', (answer) => {
        (mutableOutput as any).muted = false;
        process.stdout.write('\n');
        rl.close();
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
