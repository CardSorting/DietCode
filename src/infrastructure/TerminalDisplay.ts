/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of visual communication (Terminal).
 */

import type { Display } from '../domain/Display';

export class TerminalDisplay implements Display {
  private colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    magenta: '\x1b[35m',
    blue: '\x1b[34m',
  };

  status(message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info'): void {
    const symbol = type === 'success' ? '✔' : type === 'error' ? '✘' : type === 'warn' ? '⚠' : 'ℹ';
    const color = type === 'success' ? this.colors.green : type === 'error' ? this.colors.red : type === 'warn' ? this.colors.yellow : this.colors.cyan;
    
    process.stdout.write(`${color}${symbol} ${message}${this.colors.reset}\n`);
  }

  progress(current: number, total: number, message: string): void {
    const percentage = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));
    process.stdout.write(`\r${this.colors.cyan}[${bar}] ${percentage}% - ${message}${this.colors.reset}`);
    if (current === total) process.stdout.write('\n');
  }

  code(content: string, language: string): void {
    process.stdout.write(`\n${this.colors.dim}--- [CODE: ${language.toUpperCase()}] ---${this.colors.reset}\n`);
    process.stdout.write(`${this.colors.magenta}${content}${this.colors.reset}\n`);
    process.stdout.write(`${this.colors.dim}--------------------------${this.colors.reset}\n`);
  }

  alert(title: string, body: string, level: 'important' | 'warning' | 'caution' = 'important'): void {
    const color = level === 'warning' ? this.colors.yellow : level === 'caution' ? this.colors.red : this.colors.blue;
    process.stdout.write(`\n${this.colors.bright}${color}╔════ ${title.toUpperCase()} ════╗${this.colors.reset}\n`);
    process.stdout.write(`${color}║ ${body}${this.colors.reset}\n`);
    process.stdout.write(`${color}╚══════════════════════════╝${this.colors.reset}\n`);
  }

  thought(reasoning: string): void {
    process.stdout.write(`\n${this.colors.dim}💭 ${this.colors.reset}${this.colors.blue}${reasoning}${this.colors.reset}\n`);
  }
}
