/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of visual communication (Terminal).
 */

import type { Display } from '../domain/system/Display';

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
    const color =
      type === 'success'
        ? this.colors.green
        : type === 'error'
          ? this.colors.red
          : type === 'warn'
            ? this.colors.yellow
            : this.colors.cyan;

    process.stdout.write(`${color}${symbol} ${message}${this.colors.reset}\n`);
  }

  progress(current: number, total: number, message: string): void {
    const percentage = Math.round((current / total) * 100);
    const bar =
      '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));
    process.stdout.write(
      `\r${this.colors.cyan}[${bar}] ${percentage}% - ${message}${this.colors.reset}`,
    );
    if (current === total) process.stdout.write('\n');
  }

  code(content: string, language: string): void {
    process.stdout.write(
      `\n${this.colors.dim}--- [CODE: ${language.toUpperCase()}] ---${this.colors.reset}\n`,
    );

    // Simple production-hardened syntax highlighting for common keywords
    let highlighted = content;
    const keywords = [
      'export',
      'class',
      'interface',
      'import',
      'from',
      'private',
      'public',
      'protected',
      'async',
      'await',
      'return',
      'if',
      'else',
      'for',
      'while',
      'const',
      'let',
      'type',
    ];

    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'g');
      highlighted = highlighted.replace(regex, `${this.colors.cyan}${kw}${this.colors.reset}`);
    }

    // Highlight strings
    highlighted = highlighted.replace(
      /(['"`])(.*?)\1/g,
      `${this.colors.green}$1$2$1${this.colors.reset}`,
    );

    // Highlight comments
    highlighted = highlighted.replace(
      /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
      `${this.colors.dim}$1${this.colors.reset}`,
    );

    process.stdout.write(`${highlighted}\n`);
    process.stdout.write(`${this.colors.dim}--------------------------${this.colors.reset}\n`);
  }

  alert(
    title: string,
    body: string,
    level: 'important' | 'warning' | 'caution' = 'important',
  ): void {
    const color =
      level === 'warning'
        ? this.colors.yellow
        : level === 'caution'
          ? this.colors.red
          : this.colors.blue;
    process.stdout.write(
      `\n${this.colors.bright}${color}╔════ ${title.toUpperCase()} ════╗${this.colors.reset}\n`,
    );
    process.stdout.write(`${color}║ ${body}${this.colors.reset}\n`);
    process.stdout.write(`${color}╚══════════════════════════╝${this.colors.reset}\n`);
  }

  thought(reasoning: string): void {
    process.stdout.write(
      `\n${this.colors.dim}💭 ${this.colors.reset}${this.colors.blue}${reasoning}${this.colors.reset}\n`,
    );
  }
}
