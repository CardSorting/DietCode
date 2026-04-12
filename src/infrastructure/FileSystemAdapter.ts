/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Concrete implementation of filesystem operations using Node.js 'fs'.
 * Implements the Domain Filesystem interface.
 */

import { execSync } from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { FocusShield } from '../core/task/FocusShield';
import type { Filesystem, GitStatus } from '../domain/system/Filesystem';
import { ActiveIntegrityScanner } from './monitoring/ActiveIntegrityScanner';
import { MetabolicMonitor } from './monitoring/MetabolicMonitor';
import { PathValidator } from './validation/PathValidator';

export class FileSystemAdapter implements Filesystem {
  private validator: PathValidator;
  private monitor = MetabolicMonitor.getInstance();
  public scanner = new ActiveIntegrityScanner();
  private focusShield = FocusShield.getInstance();

  constructor(validator?: PathValidator) {
    this.validator = validator || new PathValidator();
  }

  private checkFocus(filePath: string): void {
    if (!this.focusShield.isAllowed(filePath)) {
      throw new Error(
        `Sovereign Scope Violation: File "${filePath}" is outside the current Focus Bundle.`,
      );
    }
  }

  readFile(filePath: string): string {
    this.checkFocus(filePath);
    const validatedPath = this.validator.validate(filePath);
    const content = fs.readFileSync(validatedPath, 'utf8');
    this.monitor.recordRead(filePath);

    // Pass 18: Background Integrity Guard
    this.scanner.verifyFileIntegrity(validatedPath).catch(console.error);

    return content;
  }

  readFileBuffer(filePath: string): Promise<Uint8Array> {
    this.checkFocus(filePath);
    const validatedPath = this.validator.validate(filePath);
    this.monitor.recordRead(filePath);

    // Pass 18: Background Integrity Guard
    this.scanner.verifyFileIntegrity(validatedPath).catch(console.error);

    return Promise.resolve(fs.readFileSync(validatedPath));
  }

  readFileAsStream(filePath: string): AsyncGenerator<Buffer, void, undefined> {
    this.checkFocus(filePath);
    const validatedPath = this.validator.validate(filePath);
    this.monitor.recordRead(filePath);
    const stream = fs.createReadStream(validatedPath);
    let buffer = Buffer.alloc(0);

    return (async function* () {
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
        yield chunk;
      }
    })();
  }

  readRange(filePath: string, startLine: number, endLine: number): string {
    this.checkFocus(filePath);
    const validatedPath = this.validator.validate(filePath);
    const content = fs.readFileSync(validatedPath, 'utf8');
    this.monitor.recordRead(filePath);
    const lines = content.split('\n');
    return lines.slice(startLine - 1, endLine).join('\n');
  }

  writeFile(filePath: string, content: string, options?: { mode?: number }): void {
    this.checkFocus(filePath);
    const validatedPath = this.validator.validate(filePath);
    let linesAdded = 0;
    let linesDeleted = 0;

    // Simple line delta calculation for telemetry
    try {
      if (fs.existsSync(validatedPath)) {
        const oldContent = fs.readFileSync(validatedPath, 'utf8');
        const oldLines = oldContent.split('\n').length;
        const newLines = content.split('\n').length;
        if (newLines > oldLines) linesAdded = newLines - oldLines;
        else linesDeleted = oldLines - newLines;
      } else {
        linesAdded = content.split('\n').length;
      }
    } catch (e) {
      // Ignore for telemetry
    }

    // Pass 19: Shadow Write Atomicity
    const tmpDir = path.join(this.validator.getWorkspaceRoot(), '.dietcode', 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const tmpPath = path.join(tmpDir, `shadow_${crypto.randomUUID()}.tmp`);
    
    try {
      // 1. Write to shadow file
      const fd = fs.openSync(tmpPath, 'w', options?.mode);
      fs.writeSync(fd, content, 0, 'utf8');
      
      // 2. Physical sync to media
      fs.fsyncSync(fd);
      fs.closeSync(fd);

      // 3. Atomic rename (Standard POSIX behavior)
      fs.renameSync(tmpPath, validatedPath);
    } catch (err) {
      if (fs.existsSync(tmpPath)) {
        try { fs.unlinkSync(tmpPath); } catch { /* ignore cleanup error */ }
      }
      throw err;
    }

    // Pass 18: Record Sovereign Signature
    const signature = crypto.createHash('sha256').update(content).digest('hex');
    this.scanner.recordFileState(validatedPath, signature).catch(console.error);

    this.monitor.recordWrite(validatedPath, linesAdded, linesDeleted);
  }

  mkdir(dirPath: string): void {
    this.checkFocus(dirPath);
    const validatedPath = this.validator.validate(dirPath);
    fs.mkdirSync(validatedPath, { recursive: true });
    this.monitor.recordWrite(dirPath, 1, 0); // Directory creation counts as a minor write
  }

  exists(filePath: string): boolean {
    if (!this.focusShield.isAllowed(filePath)) return false;
    const validatedPath = this.validator.validate(filePath);
    return fs.existsSync(validatedPath);
  }

  stat(filePath: string): { isDirectory: boolean; isFile: boolean; mtimeMs: number } {
    this.checkFocus(filePath);
    const validatedPath = this.validator.validate(filePath);
    const stats = fs.statSync(validatedPath);
    return {
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      mtimeMs: stats.mtimeMs,
    };
  }

  walk(root: string, ignorer?: { isIgnored(path: string): boolean }): Array<{ path: string }> {
    const files: { path: string }[] = [];
    const internalWalk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(root, fullPath);

        if (ignorer?.isIgnored(relativePath)) continue;

        if (entry.isDirectory()) {
          // Hardcoded safety defaults
          if (['node_modules', '.git', '.gemini'].includes(entry.name)) continue;
          internalWalk(fullPath);
        } else {
          files.push({ path: relativePath });
        }
      }
    };
    internalWalk(root);
    return files;
  }

  match(pattern: string, filePath: string): boolean {
    // Simple glob-to-regex conversion for minimalism
    // This handles basic patterns like node_modules, *.log, src/**/*.ts
    const regexStr = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '(.+)')
      .replace(/\*/g, '([^/]+)')
      .replace(/\?/g, '(.)');

    // Add start/end anchors and allow matching components in paths
    const regex = new RegExp(`(^|/)${regexStr}(/|$)`);
    return regex.test(filePath);
  }

  readdir(dirPath: string): Array<{ name: string; isDirectory: boolean }> {
    const validatedPath = this.validator.validate(dirPath);
    const entries = fs.readdirSync(validatedPath, { withFileTypes: true });

    return entries
      .filter((e) => this.focusShield.isAllowed(path.join(dirPath, e.name)))
      .map((e) => ({
        name: e.name,
        isDirectory: e.isDirectory(),
      }));
  }

  getGitStatus(root: string): GitStatus {
    try {
      const stdout = execSync('git status --porcelain', { cwd: root }).toString();
      const staged: string[] = [];
      const unstaged: string[] = [];
      const untracked: string[] = [];

      for (const line of stdout.split('\n')) {
        const status = line.slice(0, 2);
        const file = line.slice(3).trim();
        if (!file) continue;

        if (status === 'A ' || status === 'M ') staged.push(file);
        else if (status === ' M' || status === 'MM') unstaged.push(file);
        else if (status === '??') untracked.push(file);
      }
      return { staged, unstaged, untracked };
    } catch {
      return { staged: [], unstaged: [], untracked: [] };
    }
  }

  getGitDiff(root: string): string {
    const validatedPath = this.validator.validate(root);
    try {
      return execSync('git diff', { cwd: validatedPath }).toString();
    } catch {
      return '';
    }
  }

  getBranch(root: string): string {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', { cwd: root }).toString().trim();
    } catch {
      return 'main';
    }
  }

  async rename(from: string, to: string): Promise<void> {
    const validatedFrom = this.validator.validate(from);
    const validatedTo = this.validator.validate(to);
    return fs.promises.rename(validatedFrom, validatedTo);
  }

  async unlink(filePath: string): Promise<void> {
    const validatedPath = this.validator.validate(filePath);
    return fs.promises.unlink(validatedPath);
  }

  async *streamFileHash(filePath: string): AsyncGenerator<string, void, undefined> {
    const validatedPath = this.validator.validate(filePath);
    const stream = fs.createReadStream(validatedPath);
    const hash = crypto.createHash('sha256');

    for await (const chunk of stream) {
      hash.update(chunk);
      yield hash.digest('hex');
    }
  }
}
