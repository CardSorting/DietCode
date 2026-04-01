/**
 * [LAYER: DOMAIN]
 * Principle: Pure interface for filesystem operations.
 * Allows Core logic to interact with the disk without knowing implementation details.
 */

export interface GitStatus {
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export interface Filesystem {
  readFile(path: string): string;
  readRange(path: string, startLine: number, endLine: number): string;
  writeFile(path: string, content: string): void;
  mkdir(path: string): void;
  exists(path: string): boolean;
  stat(path: string): { isDirectory: boolean; isFile: boolean; mtimeMs: number };
  walk(root: string): string[];
  readdir(path: string): Array<{ name: string; isDirectory: boolean }>;
  getGitStatus(root: string): GitStatus;
  getGitDiff(root: string): string;
  getBranch(root: string): string;
  match(pattern: string, path: string): boolean;
}
