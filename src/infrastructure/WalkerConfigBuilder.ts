/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Infrastructure implementation of FileWalkerConfig builder.
 * Provides fluent API with ForgeWalker-style preset strategies.
 * 
 * Inspired by: ForgeWalker's WalkerConfigBuilder with min_all + max_all presets
 * Violations: None
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - [IMPLEMENT] Fluent builder for FileWalkerConfig with preset strategies
 */
import type { FileWalkerConfig, FileWalkerStrategy } from '../../domain/system/FileWalkerOptions';

/**
 * Fluent builder for FileWalker configuration.
 * Provides preset strategies and incremental configuration.
 * 
 * Usage:
 * ```typescript
 * const config = WalkerConfigBuilder.minimal()
 *   .maxDepth(10)
 *   .maxTotalFileSizeBytes(50 * 1024 * 1024)
 *   .build();
 * ```
 */
export class WalkerConfigBuilder implements Partial<FileWalkerConfig> {
  private config: FileWalkerConfig = {
    strategy: FileWalkerStrategy.MINIMAL,
    maxDepth: 5,
    maxBreadth: 10,
    maxFileSizeBytes: 1024 * 1024, // 1MB
    maxTotalFileSizeBytes: 10 * 1024 * 1024, // 10MB
    skipBinary: true,
    includeDotfiles: false,
  };

  /**
   * Create a builder with MINIMAL strategy preset.
   * Conservative traversal: depth=5, 1MB files, skip binary, 10MB total.
   * 
   * @returns New WalkerConfigBuilder instance
   */
  static minimal(): WalkerConfigBuilder {
    const builder = new WalkerConfigBuilder();
    builder.strategy(FileWalkerStrategy.MINIMAL);
    return builder;
  }

  /**
   * Create a builder with MODERATE strategy preset.
   * Balanced traversal: depth=15, 10MB files, include binary, 100MB total.
   * 
   * @returns New WalkerConfigBuilder instance
   */
  static moderate(): WalkerConfigBuilder {
    const builder = new WalkerConfigBuilder();
    builder.strategy(FileWalkerStrategy.MODERATE);
    return builder;
  }

  /**
   * Create a builder with MAXIMAL strategy preset.
   * Aggressive full traversal: unlimited depth/size.
   * Use with caution — can scan entire filesystem.
   * 
   * @returns New WalkerConfigBuilder instance
   */
  static maximal(): WalkerConfigBuilder {
    const builder = new WalkerConfigBuilder();
    builder.strategy(FileWalkerStrategy.MAXIMAL);
    return builder;
  }

  /**
   * Set the overall traversal strategy preset.
   * Controls default limits when other values are undefined.
   * 
   * @param strategy - FileWalkerStrategy preset
   * @returns This builder for method chaining
   */
  strategy(strategy: FileWalkerStrategy): this {
    this.config.strategy = strategy;
    return this;
  }

  /**
   * Set maximum directory depth to traverse.
   * Prevents infinite recursion on nested structures.
   * 
   * @param depth - Maximum depth (0 = allow infinite, default: 5)
   * @returns This builder for method chaining
   */
  maxDepth(depth: number): this {
    this.config.maxDepth = depth;
    return this;
  }

  /**
   * Set maximum number of files per directory (breadth limit).
   * Prevents scanning huge directories (e.g., node_modules).
   * 
   * @param breadth - Maximum files per directory (0 = unlimited)
   * @returns This builder for method chaining
   */
  maxBreadth(breadth: number): this {
    this.config.maxBreadth = breadth;
    return this;
  }

  /**
   * Set maximum size of individual files.
   * Prevents reading massive binaries (e.g., AWS logs at 2GB).
   * 
   * @param size - Maximum file size in bytes
   * @returns This builder for method chaining
   */
  maxFileSize(size: number): this {
    this.config.maxFileSizeBytes = size;
    return this;
  }

  /**
   * Set maximum combined size of all files in traversal.
   * Prevents scanning multi-GB directories.
   * 
   * @param size - Maximum total size in bytes
   * @returns This builder for method chaining
   */
  maxTotalFileSize(size: number): this {
    this.config.maxTotalFileSizeBytes = size;
    return this;
  }

  /**
   * Set whether to skip binary files (exclude .exe, .png, .zip, etc).
   * Conserves I/O bandwidth by skipping known binaries.
   * 
   * @param skip - True to skip binary files, false to include all
   * @returns This builder for method chaining
   */
  skipBinary(skip: boolean): this {
    this.config.skipBinary = skip;
    return this;
  }

  /**
   * Set whether to include dotfiles (files starting with '.').
   * True includes .gitignore, .env; False excludes them.
   * 
   * @param include - True to include dotfiles, false to exclude
   * @returns This builder for method chaining
   */
  includeDotfiles(include: boolean): this {
    this.config.includeDotfiles = include;
    return this;
  }

  /**
   * Build the final configuration object.
   * Returns a frozen copy with no further modifications possible.
   * 
   * @returns FileWalkerConfig ready for use
   */
  build(): FileWalkerConfig {
    return Object.freeze({ ...this.config });
  }

  /**
   * Get the current configuration (unfrozen, for testing).
   * 
   * @returns Current partial FileWalkerConfig
   */
  get(): FileWalkerConfig {
    return this.config;
  }
}