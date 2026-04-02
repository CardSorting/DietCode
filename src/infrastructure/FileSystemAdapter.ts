/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Concrete implementation of filesystem operations using Node.js 'fs'.
 * Implements the Domain Filesystem interface.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { type Filesystem, type GitStatus } from '../domain/system/Filesystem';
import { PathValidator } from './validation/PathValidator';
import { MetabolicMonitor } from './monitoring/MetabolicMonitor';

export class FileSystemAdapter implements Filesystem {
  private validator: PathValidator;
  private monitor = MetabolicMonitor.getInstance();

  constructor(validator?: PathValidator) {
    this.validator = validator || new PathValidator();
  }

  readFile(filePath: string): string {
    const validatedPath = this.validator.validate(filePath);
    const content = fs.readFileSync(validatedPath, 'utf8');
    this.monitor.recordRead();
    return content;
  }

  readFileBuffer(filePath: string): Promise<Uint8Array> {
    const validatedPath = this.validator.validate(filePath);
    this.monitor.recordRead();
    return Promise.resolve(fs.readFileSync(validatedPath));
  }

  readFileAsStream(filePath: string): AsyncGenerator<Buffer, void, undefined> {
    const validatedPath = this.validator.validate(filePath);
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
    const validatedPath = this.validator.validate(filePath);
    const content = fs.readFileSync(validatedPath, 'utf8');
    const lines = content.split('\n');
    return lines.slice(startLine - 1, endLine).join('\n');
  }

  writeFile(filePath: string, content: string): void {
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

    fs.writeFileSync(validatedPath, content, 'utf8');
    this.monitor.recordWrite(linesAdded, linesDeleted);
  }

  mkdir(dirPath: string): void {
    const validatedPath = this.validator.validate(dirPath);
    fs.mkdirSync(validatedPath, { recursive: true });
    this.monitor.recordWrite(1, 0); // Directory creation counts as a minor write
  }

  exists(filePath: string): boolean {
    const validatedPath = this.validator.validate(filePath);
    return fs.existsSync(validatedPath);
  }

  stat(filePath: string): { isDirectory: boolean; isFile: boolean; mtimeMs: number } {
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
    return fs.readdirSync(validatedPath, { withFileTypes: true }).map(e => ({
      name: e.name,
      isDirectory: e.isDirectory()
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
    const crypto = require('crypto');
    const stream = fs.createReadStream(validatedPath);
    const hash = crypto.createHash('sha256');
    
    for await (const chunk of stream) {
      hash.update(chunk);
      yield hash.digest('hex');
    }
  }

  then<T>(onFulfilled: (data: any) => T, onRejected?: (error: any) => T): Promise<T> {
    return Promise.resolve(onFulfilled(undefined));
  }
}
