/**
 * [LAYER: DOMAIN]
 * Principle: Pure interface for filesystem operations.
 * Allows Core logic to interact with the disk without knowing implementation details.
 */

export interface Filesystem {
  readFile(path: string): string;
  writeFile(path: string, content: string): void;
  mkdir(path: string): void;
  exists(path: string): boolean;
  stat(path: string): { isDirectory: boolean; mtimeMs: number };
}
