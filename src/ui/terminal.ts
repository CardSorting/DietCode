import chalk from 'chalk';
import * as readline from 'readline';
import type { TerminalInterface } from '../domain/TerminalInterface';

export class TerminalUI implements TerminalInterface {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  logClaude(text: string) {
    console.log(chalk.green('\nClaude:'), text);
  }

  logToolUse(name: string, input: any) {
    console.log(chalk.yellow(`\nTool Use: ${name}`), JSON.stringify(input, null, 2));
  }

  logError(message: string) {
    console.error(chalk.red('\nError:'), message);
  }

  logUsage(command: string) {
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
