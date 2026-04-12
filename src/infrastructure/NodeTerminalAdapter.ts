/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as readline from 'node:readline';
import { Writable } from 'node:stream';
import type { LogService } from '../domain/logging/LogService';
import type { HudData, TerminalInterface } from '../domain/system/TerminalInterface';
import { COLORS } from '../ui/design/Theme';
import { BoxRenderer } from '../ui/renderers/BoxRenderer';
import { HudRenderer } from '../ui/renderers/HudRenderer';

class MutedWritable extends Writable {
  public muted = false;
  override _write(chunk: Buffer | string | Uint8Array, encoding: BufferEncoding, callback: (error?: Error | null) => void) {

    if (!this.muted) {
      process.stdout.write(chunk, encoding);
    }
    callback();
  }
}


export class NodeTerminalAdapter implements TerminalInterface {
  private rl: readline.Interface;

  constructor(private logService: LogService) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
  }

  logDiscovery(text: string) {
    const cleanText = text.trim() ? text : '(No response)';
    console.log(`\n${BoxRenderer.render('DIETCODE_DISCOVERY', cleanText, 'SUCCESS')}\n`);
  }


  logToolUse(name: string, input: unknown) {
    const content = JSON.stringify(input, null, 2);
    console.log(`\n${BoxRenderer.render(`TOOL_USE [${name}]`, content, 'WARNING')}\n`);
  }


  drawBox(title: string, content: string, color = 'cyan') {
    console.log(`\n${BoxRenderer.render(title, content, color)}\n`);
  }

  renderHud(data: HudData) {
    console.log(`\n${HudRenderer.render(data)}\n`);
  }

  logError(message: string) {
    console.error(COLORS.ERROR('\nError:'), message);
  }

  logSuccess(message: string) {
    console.log(COLORS.SUCCESS('\nSuccess:'), message);
  }

  logInfo(message: string) {
    console.log(COLORS.PRIMARY('\nInfo:'), message);
  }

  logUsage(command: string) {
    console.log(`Usage: bun run ${command} <prompt>`);
  }

  async promptUser(query = '> '): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(COLORS.PRIMARY(`\n${query}`), (answer) => {
        resolve(answer);
      });
    });
  }

  async promptSecret(query: string): Promise<string> {
    const mutableOutput = new MutedWritable();
    mutableOutput.muted = false;

    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: mutableOutput,
        terminal: true,
      });

      process.stdout.write(COLORS.PRIMARY(`\n${query}`));
      mutableOutput.muted = true;

      rl.question('', (answer) => {
        mutableOutput.muted = false;
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
