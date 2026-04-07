/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic, contracts, and rules — testable in isolation
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - None
 *
 * Domain contracts for context compression functionality.
 * Defines the interface that infrastructure adapters must implement.
 */

import type { SessionContext } from './ContextTypes';

/**
 * Compressed context structure (9-section template)
 */
export interface CompressedContext {
  intent: string;
  keyDecisions: string[];
  nextSteps: string[];
  errorTriage: string[];
  patterns: string[];
  fileChanges: string[];
  discreteActions: string[];
  compressedLength: number;
  compressionRatio: number;
  metadata: {
    sessionId: string;
    timestamp: Date;
    originalLength: number;
    compressedSections: { section: string; size: number }[];
  };
}

/**
 * Compression configuration options
 */
export interface CompressionOptions {
  compressThreshold?: number; // Default 70% context usage
  preservePatterns?: boolean; // Default true
  errorTriagePriority?: number; // Default 1-3 scale
  fields: {
    intent: boolean;
    decisions: boolean;
    next: boolean;
    errors: boolean;
    patterns: boolean;
    files: boolean;
    actions: boolean;
  };
}

/**
 * Domain interface for context compression strategy
 * Infrastructure adapters must implement this interface
 *
 * @example
 * ```typescript
 * class ContextCompressorAdapter implements ContextCompressionStrategy {
 *   async compress(context: SessionContext[]): Promise<CompressedContext> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export interface ContextCompressionStrategy {
  /**
   * Compresses session context using 9-section template
   *
   * @param context - Session history to compress
   * @param options - Compression configuration options
   * @returns Promise resolving to compressed context
   *
   * @description
   * Applies the 9-section compression algorithm:
   * 1. Intent: Extract user goal from first message
   * 2. Key Decisions: Identify all decisions made
   * 3. Next Steps: What's to be done next
   * 4. Error Triage: Previous errors and remedies
   * 5. Patterns: Repeated patterns discovered
   * 6. File Changes: Modified files and changes
   * 7. Discrete Actions: Specific atomic operations
   */
  compress(
    context: SessionContext[],
    options?: Partial<CompressionOptions>,
  ): Promise<CompressedContext>;

  /**
   * Estimates compression effectiveness for a context batch
   *
   * @param context - Session history to analyze
   * @returns Promise resolving to compression estimate
   */
  estimateCompression(context: SessionContext[]): Promise<{
    originalLength: number;
    estimatedCompressedLength: number;
    compressionRatio: number;
    fieldsWithContent: number;
  }>;

  /**
   * Validates compression quality
   *
   * @param compressed - Compressed context result
   * @returns Promise resolving to validation status
   */
  validate(compressed: CompressedContext): Promise<boolean>;

  /**
   * Gets compression settings
   */
  getSettings(): CompressionOptions;
}

/**
 * Context compression factory for creating domain instances
 */
export class ContextCompressionFactory {
  private constructor() {}
  /**
   * Creates a new context compression instance
   *
   * @param adapter - Infrastructure implementation of ContextCompressionStrategy
   * @returns Domain-provided compression strategy wrapper
   */
  static createDomainStrategy(adapter: ContextCompressionStrategy): ContextCompressionStrategy {
    return {
      async compress(
        context: SessionContext[],
        options?: Partial<CompressionOptions>,
      ): Promise<CompressedContext> {
        return adapter.compress(context, options);
      },
      async estimateCompression(context: SessionContext[]) {
        return adapter.estimateCompression(context);
      },
      async validate(compressed: CompressedContext) {
        return adapter.validate(compressed);
      },
      getSettings() {
        return adapter.getSettings();
      },
    };
  }

  /**
   * Creates default compression settings
   */
  static createDefaultSettings(): CompressionOptions {
    return {
      compressThreshold: 70,
      preservePatterns: true,
      errorTriagePriority: 2,
      fields: {
        intent: true,
        decisions: true,
        next: true,
        errors: true,
        patterns: true,
        files: true,
        actions: true,
      },
    };
  }
}
