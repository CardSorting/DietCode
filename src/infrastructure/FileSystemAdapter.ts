/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Concrete implementation of filesystem operations using Node.js 'fs'.
 * Implements the Domain Filesystem interface.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type { Filesystem, GitStatus } from '../domain/system/Filesystem';

export class FileSystemAdapter implements Filesystem {
  readFile(path: string): string {
    return fs.readFileSync(path, 'utf8');
  }

  readRange(filePath: string, startLine: number, endLine: number): string {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    return lines.slice(startLine - 1, endLine).join('\n');
  }

  writeFile(path: string, content: string): void {
    fs.writeFileSync(path, content, 'utf8');
  }

  mkdir(path: string): void {
    fs.mkdirSync(path, { recursive: true });
  }

  exists(path: string): boolean {
    return fs.existsSync(path);
  }

  stat(filePath: string): { isDirectory: boolean; isFile: boolean; mtimeMs: number } {
    const stats = fs.statSync(filePath);
    return {
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      mtimeMs: stats.mtimeMs,
    };
  }

  walk(root: string, ignorer?: { isIgnored(path: string): boolean }): string[] {
    const files: string[] = [];
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
          files.push(relativePath);
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
    return fs.readdirSync(dirPath, { withFileTypes: true }).map(e => ({
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
    try {
      return execSync('git diff', { cwd: root }).toString();
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
}
