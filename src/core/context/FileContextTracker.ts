/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: Centralized tracking of file context, state, and optimization.
 * Combined logic: Migration from Capabilities + Cline-inspired State Tracking.
 *
 * Orchestrates file watching, state management, stale detection,
 * and duplicate read optimization (Two-Finger Pattern).
 */

import { EventBus } from '../../core/orchestration/EventBus';
import { EventType } from '../../domain/Event';
import type { OptimizationConfig } from '../../domain/context/ContextOptimizationPolicy';
import { defaultOptimizationConfig } from '../../domain/context/ContextOptimizationPolicy';
import { FileChangeType } from '../../domain/context/FileChange';
import type {
  FileOperationSource,
  FileState,
  FileMetadataEntry as StateMetadata,
} from '../../domain/context/FileContextContract';
import type {
  DuplicateReadMetadata,
  FileOptimizationDecision,
  OptimizationSessionStats,
  ReadEntry,
} from '../../domain/context/FileMetadata';
import { aggregateReadMetadata, isReadDuplicate } from '../../domain/context/FileMetadata';
import type { FileReadResult, FileReadSource } from '../../domain/context/FileOperation';
import type {
  LivePathContext,
  RuleEvaluationContext,
  ToolIntent,
} from '../../domain/context/RuleContextContract';
import { Core } from '../../infrastructure/database/sovereign/Core';
import type {
  FileWatcherAdapter,
  FileWatcherEvent,
} from '../../infrastructure/watcher/FileWatcherAdapter';

export class FileContextTracker {
  private static instance: FileContextTracker | null = null;

  // --- State Tracking (Cline-inspired) ---
  private stateMetadata: Map<string, StateMetadata> = new Map();
  private watcher: FileWatcherAdapter | null = null;

  // --- Optimization Tracking (Legacy Capabilities) ---
  private readBuffer: ReadEntry[] = [];
  private optimizationMetadata: Map<string, DuplicateReadMetadata> = new Map();
  private config: OptimizationConfig;
  private sessionStartTimestamp: number;
  private optimizationCallback?: (decision: FileOptimizationDecision) => void;

  constructor(config?: Partial<OptimizationConfig>) {
    this.config = {
      ...defaultOptimizationConfig,
      ...config,
    };
    this.sessionStartTimestamp = Date.now();
  }

  static getInstance(config?: Partial<OptimizationConfig>): FileContextTracker {
    if (!FileContextTracker.instance) {
      FileContextTracker.instance = new FileContextTracker(config);
    }
    return FileContextTracker.instance;
  }

  // === WATCHER INTEGRATION ===

  /**
   * Initialize the tracker with a watcher
   */
  async setWatcher(watcher: FileWatcherAdapter): Promise<void> {
    this.watcher = watcher;
    this.watcher.onFileChange(async (event) => this.handleFileChangeEvent(event));

    // Initial sync from DB
    await this.sync();
  }

  /**
   * Sync persistent state from modular Sovereign DB
   */
  async sync(): Promise<void> {
    const rows = (await Core.selectWhere('hive_file_context', {})) as any;

    for (const row of rows) {
      this.stateMetadata.set(row.path, {
        path: row.path,
        state: row.state as FileState,
        source: row.source as FileOperationSource,
        lastReadDate: row.lastReadDate,
        lastEditDate: row.lastEditDate,
        signature: row.signature,
        externalEditDetected: Boolean(row.externalEditDetected),
      });
    }
    console.log(`📡 [ContextTracker] Synced ${rows.length} files from SovereignDb`);
  }

  /**
   * Handle events from the file watcher
   */
  private async handleFileChangeEvent(event: FileWatcherEvent): Promise<void> {
    const existing = this.stateMetadata.get(event.path);
    if (!existing) return;

    if (event.type === FileChangeType.MODIFIED) {
      // If we get here, it wasn't a self-edit (handled by markAsEditedByAgent)
      existing.state = 'modified_externally';
      existing.externalEditDetected = true;
      existing.lastEditDate = event.timestamp;

      // Persist the staleness immediately
      await this.persistState(existing);

      console.warn(`⚠️ External modification detected on ${event.path}. Context is now STALE.`);
    } else if (event.type === FileChangeType.DELETED) {
      existing.state = 'deleted';
    }
  }

  // === OPTIMIZATION LOGIC (Merged) ===

  /**
   * Register an optimization event callback
   */
  onOptimization(callback: (decision: FileOptimizationDecision) => void): void {
    this.optimizationCallback = callback;
  }

  /**
   * Record a file read operation with optimization
   * @returns The optimized file read result
   */
  async recordRead(
    filePath: string,
    content: string,
    source: FileReadSource,
  ): Promise<FileReadResult> {
    const entry: ReadEntry = {
      filePath,
      content,
      timestamp: Date.now(),
      contentHash: await this.calculateHash(content),
      source,
      originalLength: content.length,
    };

    // Update State Tracking
    await this.recordState(filePath, 'read_tool', 'read', entry.contentHash);

    return this.processReadEntry(entry);
  }

  /**
   * Process a single read entry (Optimization)
   */
  private processReadEntry(entry: ReadEntry): FileReadResult {
    const duplicateMetadata = this.getFileDuplicateMetadata(entry.filePath);
    const isDuplicate = this.detectDuplicateRead(entry, duplicateMetadata);

    let result: FileReadResult;

    if (isDuplicate) {
      if (this.config.enableTwoFinger) {
        result = this.applyTwoFingerPattern(entry.filePath);

        if (this.optimizationCallback) {
          this.optimizationCallback({
            filePath: entry.filePath,
            keepOriginal: false,
            applyTwoFingerPattern: true,
            duplicateWindowMs: this.config.duplicateWindowMs,
            savingsThreshold: this.config.savingsThreshold,
            calculatedSavings: this.calculateSavingsPercentage(
              duplicateMetadata.firstReadContentHash.length,
              43,
            ),
            reason: `duplicate_within_${this.config.duplicateWindowMs}ms_window`,
          });
        }
      } else {
        result = {
          ...entry,
          optimizedLength: entry.originalLength,
          wasOptimized: false,
          hash: entry.contentHash,
          sizeBytes: entry.originalLength,
        };
      }
      this.updateOptimizationMetadata(entry.filePath, entry.timestamp, duplicateMetadata);
    } else {
      result = {
        ...entry,
        optimizedLength: entry.originalLength,
        wasOptimized: false,
        hash: entry.contentHash,
        sizeBytes: entry.originalLength,
      };

      this.readBuffer.push(entry);

      duplicateMetadata.firstReadTimestamp = entry.timestamp;
      duplicateMetadata.firstReadContentHash = entry.contentHash;
      duplicateMetadata.duplicateCount = 1;
      duplicateMetadata.subsequentReadTimestamps = [];
      duplicateMetadata.isDuplicate = false;

      this.optimizationMetadata.set(entry.filePath, duplicateMetadata);
    }

    return result;
  }

  // === STATE TRACKING LOGIC (Merged) ===

  /**
   * Record a state change (Record of Truth)
   */
  async recordState(
    path: string,
    source: FileOperationSource,
    type: 'read' | 'edit' | 'delete',
    signature?: string,
  ): Promise<void> {
    const existing = this.stateMetadata.get(path);
    const now = Date.now();

    const entry: StateMetadata = {
      path,
      state: type === 'delete' ? 'deleted' : 'active',
      source,
      lastReadDate: type === 'read' ? now : existing?.lastReadDate || null,
      lastEditDate: type === 'edit' ? now : existing?.lastEditDate || null,
      externalEditDetected: false,
      signature: signature || existing?.signature,
    };

    this.stateMetadata.set(path, entry);
    await this.persistState(entry);

    if (type === 'edit' && source === 'codemarie_edited' && this.watcher) {
      this.watcher.markAsEditedByAgent(path);
    }
  }

  /**
   * Persist state entry to modular Sovereign DB
   */
  private async persistState(entry: StateMetadata): Promise<void> {
    // Check if exists first
    const rows = (await Core.selectWhere('hive_file_context', { path: entry.path })) as any;

    if (rows.length > 0) {
      // Update existing
      await Core.push({
        type: 'update',
        table: 'hive_file_context',
        where: { path: entry.path },
        values: {
          state: entry.state,
          source: entry.source,
          lastReadDate: entry.lastReadDate,
          lastEditDate: entry.lastEditDate,
          signature: entry.signature,
          externalEditDetected: entry.externalEditDetected ? 1 : 0,
        },
      });
    } else {
      // Insert new
      await Core.push({
        type: 'insert',
        table: 'hive_file_context',
        values: {
          path: entry.path,
          state: entry.state,
          source: entry.source,
          lastReadDate: entry.lastReadDate,
          lastEditDate: entry.lastEditDate,
          signature: entry.signature,
          externalEditDetected: entry.externalEditDetected ? 1 : 0,
        },
      });
    }
  }

  /**
   * Get metadata for a file
   */
  getMetadata(path: string): StateMetadata | undefined {
    return this.stateMetadata.get(path);
  }

  /**
   * Check if context for a file is stale
   */
  isStale(path: string): boolean {
    const metadata = this.stateMetadata.get(path);
    return metadata
      ? metadata.state === 'modified_externally' || metadata.state === 'stale'
      : false;
  }

  // === HELPERS ===

  private getFileDuplicateMetadata(filePath: string): DuplicateReadMetadata {
    const existing = this.optimizationMetadata.get(filePath);
    return (
      existing || {
        filePath,
        firstReadTimestamp: 0,
        subsequentReadTimestamps: [],
        firstReadContentHash: '',
        duplicateCount: 0,
        isDuplicate: false,
      }
    );
  }

  private detectDuplicateRead(entry: ReadEntry, metadata: DuplicateReadMetadata): boolean {
    if (metadata.duplicateCount === 0) return false;
    const timeSinceFirstRead = Date.now() - metadata.firstReadTimestamp;
    const timeWindowExceeded = timeSinceFirstRead > this.config.duplicateWindowMs;
    return !timeWindowExceeded && entry.contentHash === metadata.firstReadContentHash;
  }

  private updateOptimizationMetadata(
    filePath: string,
    timestamp: number,
    metadata: DuplicateReadMetadata,
  ): void {
    metadata.lastReadTimestamp = timestamp;
    metadata.duplicateCount++;
    metadata.subsequentReadTimestamps.push(timestamp);
    metadata.isDuplicate = true;
    this.optimizationMetadata.set(filePath, metadata);
    if (metadata.subsequentReadTimestamps.length > 100) {
      metadata.subsequentReadTimestamps.shift();
    }
  }

  private applyTwoFingerPattern(filePath: string): FileReadResult {
    return {
      filePath,
      content: 'Duplicate file read notice',
      timestamp: Date.now(),
      source: 'context_optimization',
      originalLength:
        this.optimizationMetadata.get(filePath)?.firstReadContentHash.length ||
        filePath.length + 43,
      optimizedLength: 43,
      wasOptimized: true,
      optimizationReason: 'two_finger_pattern',
      hash: `duplicate-notice-${Date.now()}`,
      sizeBytes: 43,
    };
  }

  private calculateSavingsPercentage(originalLength: number, optimizedLength: number): number {
    if (originalLength === 0) return 0;
    return ((originalLength - optimizedLength) / originalLength) * 100;
  }

  private async calculateHash(content: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        hash = (hash << 5) - hash + content.charCodeAt(i);
        hash = (hash & hash) >>> 0;
      }
      return hash.toString(36);
    }
  }

  /**
   * Get optimization statistics for the current session
   */
  getSessionStats(): OptimizationSessionStats {
    const { duplicateMetadata } = aggregateReadMetadata(this.readBuffer);
    const applicableFiles = Array.from(duplicateMetadata.keys());
    const totalOriginalBytes = this.readBuffer.reduce((sum, e) => sum + e.originalLength, 0);

    return {
      totalReads: this.readBuffer.length,
      duplicateReads: applicableFiles.length,
      totalOriginalBytes,
      totalOptimizedBytes: totalOriginalBytes,
      bytesSaved: 0,
      percentageSaved: 0,
      applicableFiles,
      duplicatesProcessed: 0,
      sessionStartTime: this.sessionStartTimestamp,
    };
  }

  clearBuffer(): void {
    this.readBuffer = [];
    this.optimizationMetadata.clear();
    this.stateMetadata.clear();
  }
}
