/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Automated Refactoring — handles file/directory moves and robust import resolution.
 */

import * as fs from 'fs';
import * as path from 'path';
import { FileSystemAdapter } from '../FileSystemAdapter';

export class RefactorTools {
  private fsAdapter: FileSystemAdapter;

  constructor() {
    this.fsAdapter = new FileSystemAdapter();
  }

  /**
   * Moves a file and updates all importing files to point to the new location.
   * Also updates relative imports within the moved file itself.
   */
  async moveAndFixImports(oldPath: string, newPath: string, projectRoot: string): Promise<void> {
    const absOldPath = path.resolve(projectRoot, oldPath);
    const absNewPath = path.resolve(projectRoot, newPath);

    if (!fs.existsSync(absOldPath)) {
      throw new Error(`Source file does not exist: ${oldPath}`);
    }

    // Ensure target directory exists
    const newDir = path.dirname(absNewPath);
    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(newDir, { recursive: true });
    }

    const content = fs.readFileSync(absOldPath, 'utf8');

    // 1. Update relative imports within the moved file
    const updatedContent = this.updateInternalImports(content, absOldPath, absNewPath);

    // 2. Write to new location
    fs.writeFileSync(absNewPath, updatedContent);

    // 3. Update external imports (all files that import this file)
    await this.updateExternalImports(absOldPath, absNewPath, projectRoot);

    // 4. Delete old file
    fs.unlinkSync(absOldPath);
    
    console.log(`✅ Moved ${path.relative(projectRoot, absOldPath)} to ${path.relative(projectRoot, absNewPath)}`);
  }

  /**
   * Moves an entire directory and updates all imports (internal and external) recursive.
   */
  async moveDirectoryAndFixImports(oldDir: string, newDir: string, projectRoot: string): Promise<void> {
    const absOldDir = path.resolve(projectRoot, oldDir);
    const absNewDir = path.resolve(projectRoot, newDir);

    if (!fs.existsSync(absOldDir) || !fs.statSync(absOldDir).isDirectory()) {
      throw new Error(`Source directory does not exist or is not a directory: ${oldDir}`);
    }

    const files = this.getAllTsFiles(absOldDir);
    
    console.log(`📂 Refactoring directory: ${oldDir} → ${newDir} (${files.length} files)`);

    // Sort files by depth to prevent moving parent before child in logic
    for (const absFilePath of files) {
      const relPathInDir = path.relative(absOldDir, absFilePath);
      const absNewFilePath = path.join(absNewDir, relPathInDir);
      
      await this.moveAndFixImports(absFilePath, absNewFilePath, projectRoot);
    }

    // Cleanup empty old dirs
    this.removeEmptyDirs(absOldDir);
  }

  private updateInternalImports(content: string, oldPath: string, newPath: string): string {
    const oldDir = path.dirname(oldPath);
    const newDir = path.dirname(newPath);

    // Perfect Resolver Regex: Handles multiline, type-only, and backticks
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

      // Only replace if it was a relative import
      if (originalImportPath.startsWith('.')) {
        return match.replace(originalImportPath, newRelativePath);
      }
      return match;
    });
  }

  private async updateExternalImports(oldPath: string, newPath: string, projectRoot: string): Promise<void> {
    const oldBase = oldPath.replace(/\.ts$/, '');
    const oldFileName = path.basename(oldBase);

    // Performance Optimization: Use grep to find candidate files
    const srcDir = path.join(projectRoot, 'src');
    const command = `grep -rl "${oldFileName}" "${srcDir}" --include="*.ts"`;
    
    let candidateFiles: string[] = [];
    try {
      const { execSync } = require('child_process');
      const output = execSync(command).toString();
      candidateFiles = output.split('\n').filter((f: string) => f.trim().length > 0);
    } catch (e) {
      return; // No files contain the string
    }

    for (const filePath of candidateFiles) {
      if (filePath === newPath || filePath === oldPath) continue;

      let content = fs.readFileSync(filePath, 'utf8');
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
          // Use regex escape for the original path to safely replace it
          const escapedPath = importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return match.replace(new RegExp(escapedPath), newRelativeImport);
        }
        return match;
      });

      if (changed) {
        fs.writeFileSync(filePath, content);
      }
    }
  }

  private getAllTsFiles(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const name = path.join(dir, file);
      if (fs.statSync(name).isDirectory()) {
        this.getAllTsFiles(name, fileList);
      } else if (name.endsWith('.ts')) {
        fileList.push(name);
      }
    }
    return fileList;
  }

  private removeEmptyDirs(dir: string): void {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    if (files.length > 0) {
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          this.removeEmptyDirs(fullPath);
        }
      }
    }
    
    // Final check for the current dir
    if (fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
    }
  }
}
