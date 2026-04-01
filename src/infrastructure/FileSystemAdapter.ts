/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Concrete implementation of filesystem operations using Node.js 'fs'.
 * Implements the Domain Filesystem interface.
 */

import * as fs from 'fs';
import type { Filesystem } from '../domain/Filesystem';

export class FileSystemAdapter implements Filesystem {
  readFile(path: string): string {
    return fs.readFileSync(path, 'utf8');
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

  stat(path: string): { isDirectory: boolean; mtimeMs: number } {
    const stats = fs.statSync(path);
    return {
      isDirectory: stats.isDirectory(),
      mtimeMs: stats.mtimeMs,
    };
  }
}
