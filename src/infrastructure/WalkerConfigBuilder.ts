/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Infrastructure implementation of FileWalkerConfig builder
 *
 * Inspired by: ForgeWalker's WalkerConfigBuilder with preset strategies
 */

import type { FileWalkerConfig } from '../domain/system/FileWalkerOptions';
import { FileWalkerStrategy } from '../domain/system/FileWalkerOptions';

/**
 * Fluent builder for FileWalker configuration
 *
 * Usage:
 * ```typescript
 * const config = WalkerConfigBuilder.minimal()
 *   .maxDepth(10)
 *   .maxTotalFileSizeBytes(50 * 1024 * 1024)
 *   .build();
 * ```
 */
export class WalkerConfigBuilder {
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
   * Create a builder with MINIMAL strategy preset
   */
  static minimal(): WalkerConfigBuilder {
    const builder = new WalkerConfigBuilder();
    builder.config.strategy = FileWalkerStrategy.MINIMAL;
    return builder;
  }

  /**
   * Create a builder with MODERATE strategy preset
   */
  static moderate(): WalkerConfigBuilder {
    const builder = new WalkerConfigBuilder();
    builder.config.strategy = FileWalkerStrategy.MODERATE;
    return builder;
  }

  /**
   * Create a builder with MAXIMAL strategy preset
   */
  static maximal(): WalkerConfigBuilder {
    const builder = new WalkerConfigBuilder();
    builder.config.strategy = FileWalkerStrategy.MAXIMAL;
    return builder;
  }

  /**
   * Set the traversal strategy
   */
  strategy(strategy: FileWalkerStrategy): this {
    this.config.strategy = strategy;
    return this;
  }

  /**
   * Set maximum directory depth
   */
  maxDepth(depth: number): this {
    this.config.maxDepth = depth;
    return this;
  }

  /**
   * Set maximum files per directory
   */
  maxBreadth(breadth: number): this {
    this.config.maxBreadth = breadth;
    return this;
  }

  /**
   * Set maximum file size in bytes
   */
  maxFileSize(size: number): this {
    this.config.maxFileSizeBytes = size;
    return this;
  }

  /**
   * Set maximum total file size in bytes
   */
  maxTotalFileSize(size: number): this {
    this.config.maxTotalFileSizeBytes = size;
    return this;
  }

  /**
   * Set whether to skip binary files
   */
  skipBinary(skip: boolean): this {
    this.config.skipBinary = skip;
    return this;
  }

  /**
   * Set whether to include dotfiles
   */
  includeDotfiles(include: boolean): this {
    this.config.includeDotfiles = include;
    return this;
  }

  /**
   * Build and freeze the configuration
   */
  build(): FileWalkerConfig {
    return Object.freeze({ ...this.config });
  }

  /**
   * Get the current configuration
   */
  get(): FileWalkerConfig {
    return this.config;
  }
}
