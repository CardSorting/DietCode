/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic for file traversal limit strategies.
 * Defines preset execution strategies and custom configuration options.
 * Infrastructure adapters implement traversal with these constraints.
 *
 * Inspired by: ForgeWalker's Walker config with min_all/max_all presets
 * Violations: None
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - [FINALIZE] Domain traversal strategy interfaces for infrastructure
 */
/**
 * Traversal limit strategies (ForgeWalker-inspired).
 * Each preset provides balanced settings for different use cases.
 */
export enum FileWalkerStrategy {
  /**
   * Conservative minimally-invasive traversal.
   * Config: depth=5, max 1MB file size, skip binary, 10MB total
   * Use case: Large codebases, security scanners, CI pipelines
   */
  MINIMAL = 'minimal',

  /**
   * Balanced traversal for day-to-day operations.
   * Config: depth=15, max 10MB file size, lenient binary, 100MB total
   * Use case: Feature development, debugging, code reviews
   */
  MODERATE = 'moderate',

  /**
   * Aggressive full-traversal.
   * Config: unlimited depth/size, include all files, skip no content
   * Use case: Indexing, backup tools, exhaustive searches
   */
  MAXIMAL = 'maximal',

  /**
   * Custom configuration per invocation.
   * Use case: Ad-hoc scenarios requiring specific limits
   */
  CUSTOM = 'custom',
}

/**
 * Complete configuration for file traversal operations.
 * Applied by infrastructure adapters to limit resource usage.
 */
export interface FileWalkerConfig {
  /**
   * Overall traversal strategy preset (controls default limits).
   */
  strategy: FileWalkerStrategy;

  /**
   * Maximum directory depth to traverse (relative to base path).
   * Prevents infinite recursion on nested symlinks/trash.
   */
  maxDepth?: number;

  /**
   * Maximum number of files per directory (breadth limit).
   * Prevents scanning giant directories with 10k files.
   */
  maxBreadth?: number;

  /**
   * Maximum size of individual files to process.
   * Prevents reading massive binaries (e.g., AWS logs).
   */
  maxFileSizeBytes?: number;

  /**
   * Maximum combined size of all files in traversal.
   * Prevents scanning multi-GB directories without permission.
   */
  maxTotalFileSizeBytes?: number;

  /**
   * Whether to skip files that look binary (based on extension).
   * True: skip .exe, .png, .zip (saves time in codebases)
   * False: include all files regardless of type
   */
  skipBinary: boolean;

  /**
   * Whether to include dotfiles (files starting with '.').
   * True: includes .gitignore, .env (use with caution)
   * False: standard behavior (skip dotfiles)
   */
  includeDotfiles: boolean;
}

// Alias for backward compatibility
export type FileWalkerOptions = FileWalkerConfig;

/**
 * Default config for MINIMAL strategy (Facebook/ForgeWalker default).
 * Matches conservative settings with 1MB files, 5 depth, binary skip.
 */
export const MINIMAL_CONFIG: Partial<FileWalkerConfig> = {
  maxDepth: 5,
  maxBreadth: 10,
  maxFileSizeBytes: 1024 * 1024, // 1MB
  maxTotalFileSizeBytes: 10 * 1024 * 1024, // 10MB
  skipBinary: true,
};

/**
 * Default config for MODERATE strategy (FC default).
 * Balanced settings for general usage.
 */
export const MODERATE_CONFIG: Partial<FileWalkerConfig> = {
  maxDepth: 15,
  maxBreadth: 50,
  maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
  maxTotalFileSizeBytes: 100 * 1024 * 1024, // 100MB
  skipBinary: false,
};

/**
 * Default config for MAXIMAL strategy (dangerous).
 * Unlimited traversal — use with caution.
 */
export const MAXIMAL_CONFIG: Partial<FileWalkerConfig> = {
  maxDepth: Number.POSITIVE_INFINITY,
  maxBreadth: Number.POSITIVE_INFINITY,
  maxFileSizeBytes: Number.POSITIVE_INFINITY,
  maxTotalFileSizeBytes: Number.POSITIVE_INFINITY,
  skipBinary: false,
};
