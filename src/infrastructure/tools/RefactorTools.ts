/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Extreme Throughput Refactoring — O(1) dependency lookup via JoyCache.
 */

import * as fs from 'fs/promises';
import { existsSync, readdirSync, statSync, mkdirSync, rmdirSync, unlinkSync } from 'fs'; 
import * as path from 'path';
import { FileSystemAdapter } from '../FileSystemAdapter';
import { ParallelProcessor } from './ParallelProcessor';
import { SqliteJoyCacheRepository } from '../database/SqliteJoyCacheRepository';

export class RefactorTools {
  private fsAdapter: FileSystemAdapter;
  private joyCache: SqliteJoyCacheRepository;

  constructor() {
    this.fsAdapter = new FileSystemAdapter();
    this.joyCache = new SqliteJoyCacheRepository();
  }

  /**
   * Moves a file and updates all importing files to point to the new location.
   * Also updates relative imports within the moved file itself.
   */
  async moveAndFixImports(oldPath: string, newPath: string, projectRoot: string): Promise<void> {
    const absOldPath = path.resolve(projectRoot, oldPath);
    const absNewPath = path.resolve(projectRoot, newPath);

    if (!existsSync(absOldPath)) {
      throw new Error(`Source file does not exist: ${oldPath}`);
    }

    // Pass 7: Speculative JoyCache Update (Predictive)
    // We update the cache with the new path BEFORE writing the file
    // so it's ready for any concurrent lookups immediately.
    this.updateCache(absOldPath, projectRoot).then(() => {
        // After physical move, the cache for oldPath is removed
        this.joyCache.removeFile(absOldPath);
    });

    // Ensure target directory exists
    const newDir = path.dirname(absNewPath);
    await fs.mkdir(newDir, { recursive: true });

    const content = await fs.readFile(absOldPath, 'utf8');

    // 1. Update relative imports within the moved file
    const updatedContent = this.updateInternalImports(content, absOldPath, absNewPath);

    // 2. Write to new location
    await fs.writeFile(absNewPath, updatedContent);

    // 3. Update external imports (all files that import this file) in parallel via CACHE
    await this.updateExternalImports(absOldPath, absNewPath, projectRoot);

    // 4. Update the cache for the new path location
    await this.updateCache(absNewPath, projectRoot);
    await this.joyCache.removeFile(absOldPath);

    // 5. Delete old file
    await fs.unlink(absOldPath);
    
    console.log(`🚀 [JoyCache] Moved ${path.relative(projectRoot, absOldPath)} to ${path.relative(projectRoot, absNewPath)} (O(1) lookup)`);
  }

  /**
   * Moves an entire directory and updates all imports in parallel.
   */
  async moveDirectoryAndFixImports(oldDir: string, newDir: string, projectRoot: string): Promise<void> {
    const absOldDir = path.resolve(projectRoot, oldDir);
    const absNewDir = path.resolve(projectRoot, newDir);

    if (!existsSync(absOldDir) || !statSync(absOldDir).isDirectory()) {
      throw new Error(`Source directory does not exist or is not a directory: ${oldDir}`);
    }

    const files = this.getAllTsFiles(absOldDir);
    
    console.log(`📂 [Parallel] Refactoring directory: ${oldDir} → ${newDir} (${files.length} files)`);

    await ParallelProcessor.map(files, async (absFilePath) => {
      const relPathInDir = path.relative(absOldDir, absFilePath);
      const absNewFilePath = path.join(absNewDir, relPathInDir);
      await this.moveAndFixImports(absFilePath, absNewFilePath, projectRoot);
    }, 15);

    this.removeEmptyDirs(absOldDir);
  }

  /**
   * Synchronization: Updates the JoyCache for a specific file.
   */
  async updateCache(filePath: string, projectRoot: string): Promise<void> {
    if (!existsSync(filePath)) return;
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileDir = path.dirname(filePath);
      const imports: string[] = [];

      const importRegex = /(import|export)\s*[\s\S]*?from\s*['"`](\.\/|\.\.\/)(.*?)['"`]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
          const pathMatch = match[0].match(/from\s*['"`](.*?)['"`]/);
          if (pathMatch && pathMatch[1]) {
              const absImported = path.resolve(fileDir, pathMatch[1]);
              const importedKey = absImported.endsWith('.ts') ? absImported : absImported + '.ts';
              imports.push(importedKey);
          }
      }

      await this.joyCache.updateImports(filePath, imports);
    } catch (err) {
      console.warn(`⚠️  Failed to update JoyCache for ${filePath}:`, err);
    }
  }

  private updateInternalImports(content: string, oldPath: string, newPath: string): string {
    const oldDir = path.dirname(oldPath);
    const newDir = path.dirname(newPath);

    const importRegex = /(import|export)\s*[\s\S]*?from\s*['"`](\.\/|\.\.\/)(.*?)['"`]/g;

    return content.replace(importRegex, (match) => {
      const pathMatch = match.match(/from\s*['"`](.*?)['"`]/);
      if (!pathMatch || !pathMatch[1]) return match;

      const originalImportPath = pathMatch[1];
      const absoluteTarget = path.resolve(oldDir, originalImportPath);
      let newRelativePath = path.relative(newDir, absoluteTarget);

      if (!newRelativePath.startsWith('.')) {
          newRelativePath = './' + newRelativePath;
      }

      if (originalImportPath.startsWith('.')) {
        return match.replace(originalImportPath, newRelativePath);
      }
      return match;
    });
  }

  private async updateExternalImports(oldPath: string, newPath: string, projectRoot: string): Promise<void> {
    const candidateFiles = await this.joyCache.getDependents(oldPath);
    
    if (candidateFiles.length > 0) {
        console.log(`📡 [JoyCache] Found ${candidateFiles.length} dependents for ${path.basename(oldPath)}`);
    }

    await ParallelProcessor.map(candidateFiles, async (filePath) => {
      if (filePath === newPath || filePath === oldPath) return;

      let content = await fs.readFile(filePath, 'utf8');
      const fileDir = path.dirname(filePath);

      const importRegex = /(import|export)\s*[\s\S]*?from\s*['"`](\.\/|\.\.\/)(.*?)['"`]/g;
      let changed = false;

      content = content.replace(importRegex, (match) => {
        const pathMatch = match.match(/from\s*['"`](.*?)['"`]/);
        if (!pathMatch || !pathMatch[1]) return match;

        const importPath = pathMatch[1];
        const resolvedImport = path.resolve(fileDir, importPath);

        const absOldBase = oldPath.replace(/\.ts$/, '');
        const absResolvedBase = resolvedImport.replace(/\.ts$/, '');

        if (absOldBase === absResolvedBase) {
          let newRelativeImport = path.relative(fileDir, newPath.replace(/\.ts$/, ''));
          if (!newRelativeImport.startsWith('.')) {
              newRelativeImport = './' + newRelativeImport;
          }
          changed = true;
          const escapedPath = importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return match.replace(new RegExp(escapedPath), newRelativeImport);
        }
        return match;
      });

      if (changed) {
        await fs.writeFile(filePath, content);
        // Cascading update: Since we modified this file, update its cache entry too
        await this.updateCache(filePath, projectRoot);
      }
    }, 20);
  }

  private getAllTsFiles(dir: string, fileList: string[] = []): string[] {
    if (!existsSync(dir)) return fileList;
    const files = readdirSync(dir);
    for (const file of files) {
      const name = path.join(dir, file);
      const stat = statSync(name);
      if (stat.isDirectory()) {
         this.getAllTsFiles(name, fileList);
      } else if (name.endsWith('.ts')) {
        fileList.push(name);
      }
    }
    return fileList;
  }

  private removeEmptyDirs(dir: string): void {
    if (!existsSync(dir)) return;
    
    const files = readdirSync(dir);
    if (files.length > 0) {
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (statSync(fullPath).isDirectory()) {
          this.removeEmptyDirs(fullPath);
        }
      }
    }
    
    if (readdirSync(dir).length === 0) {
      try {
        rmdirSync(dir);
      } catch (e) {
        // Log skip if busy
      }
    }
  }
}
