/**
 * [INFRASTRUCTURE: VIM_FILE_READER]
 * Principle: Adapter for reading files via Vim protocol
 * Violations: None - implements domain interfaces through specialized adapters
 */

import { ContextOptimizationService } from '../../core/context/ContextOptimizationService';
import type { FileReadResult, FileReadSource } from '../../domain/context/FileOperation';
import { EnhancedFileSystemAdapter } from '../EnhancedFileSystemAdapter';

/**
 * VimFileReader adapter that integrates file reading with context optimization
 * It wraps file system reads and applies optimization policies
 */
export class VimFileReader {
  // The optimization service to use
  private optimizationService: ContextOptimizationService;

  constructor(optimizationService?: ContextOptimizationService) {
    this.optimizationService = optimizationService || this.createDefaultOptimizationService();
  }

  async readFile(filePath: string, rowCount?: number, offset?: number): Promise<FileReadResult> {
    try {
      // Read the file content
      const content = await this.readViaVim(filePath, rowCount, offset);

      // Record the read with optimization
      return await this.optimizationService.recordRead(filePath, content, 'tool_execute');
    } catch (error) {
      throw this.handleReadError(error, filePath);
    }
  }

  /**
   * Read multiple files at once
   */
  async readMultipleFiles(
    filePaths: string[],
    rowCount?: number,
    offset?: number,
  ): Promise<FileReadResult[]> {
    const results: FileReadResult[] = [];

    for (const filePath of filePaths) {
      try {
        const result = await this.readFile(filePath, rowCount, offset);
        results.push(result);
      } catch (error: any) {
        results.push(this.createErrorResult(filePath, error));
      }
    }

    return results;
  }

  /**
   * Check if a file has been recently read (within optimization window)
   */
  async hasRecentRead(filePath: string): Promise<boolean> {
    if (!this.optimizationService) return false;

    const stats = this.optimizationService.getStats();
    return stats.applicableFiles.includes(filePath);
  }

  /**
   * Read file via Vim protocol
   * This method would interface with a Vim extension or adapter
   */
  private async readViaVim(filePath: string, rowCount?: number, offset?: number): Promise<string> {
    const fsAdapter = new EnhancedFileSystemAdapter();

    if (rowCount !== undefined && offset !== undefined) {
      return fsAdapter.readRange(filePath, offset, offset + rowCount - 1);
    }

    return fsAdapter.readFile(filePath);
  }

  /**
   * Get file timestamp using fs.stat
   */
  private async getFileTimestamp(filePath: string): Promise<number> {
    try {
      const fsAdapter = new EnhancedFileSystemAdapter();
      const stats = fsAdapter.stat(filePath);
      return stats.mtimeMs;
    } catch {
      return Date.now();
    }
  }

  /**
   * Create a basic file result
   */
  private async createFileResult(filePath: string, content: string): Promise<FileReadResult> {
    return {
      filePath,
      content: content,
      timestamp: Date.now(),
      source: 'vim_file_reader',
      originalLength: content.length,
      optimizedLength: content.length,
      wasOptimized: false,
      hash: `vim-${Date.now()}`,
      sizeBytes: content.length,
    };
  }

  /**
   * Create an error result
   */
  private createErrorResult(filePath: string, error: Error): FileReadResult {
    return {
      filePath,
      content: error.message,
      timestamp: Date.now(),
      source: 'search_result', // Best match for error result
      originalLength: error.message.length,
      optimizedLength: error.message.length,
      wasOptimized: false,
      hash: `error-${Date.now()}`,
      sizeBytes: error.message.length,
    };
  }

  /**
   * Handle read errors
   */
  private handleReadError(error: unknown, filePath: string): Error {
    if (error instanceof Error) {
      return new Error(`Failed to read file ${filePath}: ${error.message}`);
    }

    return new Error(`Failed to read file ${filePath}: Unknown error`);
  }

  /**
   * Create a default optimization service
   */
  private createDefaultOptimizationService(): ContextOptimizationService {
    return new ContextOptimizationService();
  }

  /**
   * Get optimization service
   */
  getOptimizationService(): ContextOptimizationService {
    return this.optimizationService;
  }
}

/**
 * VimFileReader utility functions
 */
export const VimFileReaderUtils = {
  /**
   * Parse Vim command to extract file path and parameters
   */
  parseVimCommand(command: string): { filePath: string; rowCount?: number; offset?: number } {
    // Example command format: "vim:read path/to/file:10:5"
    // Or could be integrated with a proper syntax checker

    // Placeholder - would parse proper syntax
    const match = command.match(/(?:vim|read)?:([^:]+)(?::(\d+))?(?::(\d+))?/i);

    if (!match) {
      return { filePath: command };
    }

    return {
      filePath: match[1] ?? command,
      rowCount: match[2] ? Number.parseInt(match[2] as string, 10) : undefined,
      offset: match[3] ? Number.parseInt(match[3] as string, 10) : undefined,
    };
  },

  /**
   * Format a file path for Vim protocol
   */
  formatForVimProtocol(filePath: string, rowCount?: number): string {
    let result = filePath;

    if (rowCount !== undefined) {
      result += `:${rowCount}`;
    }

    return result;
  },
};
