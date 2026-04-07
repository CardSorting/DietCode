/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure interface for filesystem operations.
 * Allows Core logic to interact with the disk without knowing implementation details.
 */

import type { FileWalkerOptions } from './FileWalkerOptions';

export interface GitStatus {
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export interface Filesystem {
  // Basic text operations
  readFile(path: string): string;
  readRange(path: string, startLine: number, endLine: number): string;
  writeFile(path: string, content: string): void;
  mkdir(path: string): void;
  exists(path: string): boolean;

  // System stats
  stat(path: string): { isDirectory: boolean; isFile: boolean; mtimeMs: number };
  readdir(path: string): Array<{ name: string; isDirectory: boolean }>;

  // File system operations
  rename(from: string, to: string): Promise<void>;
  unlink(path: string): Promise<void>;

  // Git operations
  getGitStatus(root: string): GitStatus;
  getGitDiff(root: string): string;
  getBranch(root: string): string;
  match(pattern: string, path: string): boolean;

  // Enhanced binary/stream operations (ForgeFS-inspired)
  readFileBuffer(path: string, length?: number): Promise<Uint8Array>;
  readFileAsStream(path: string): AsyncGenerator<Buffer, void, undefined>;
  streamFileHash(path: string): AsyncGenerator<string, void, undefined>;

  // Utility operations
  walk(path: string, ignorer?: { isIgnored(path: string): boolean }): Array<{ path: string }>;
}
