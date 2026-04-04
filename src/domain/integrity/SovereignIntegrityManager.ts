/**
 * [LAYER: DOMAIN]
 * Principle: Unified Integrity Orchestration — Sovereign Control
 *
 * Coordinates Structural (Header) and Semantic (AST-based) sharded scans.
 */

import type { IntegrityReport, IntegrityViolation } from '../memory/Integrity';
import { JobType } from '../system/QueueProvider';
import type { QueueProvider } from '../system/QueueProvider';

export interface ScanOptions {
  projectRoot: string;
  useSemantic?: boolean;
  useStructure?: boolean;
  shardSize?: number;
}

export class SovereignIntegrityManager {
  constructor(private queue: QueueProvider) {}

  /**
   * Orchestrates a project-wide scan by sharding it into BroccoliQ jobs.
   */
  async initiateUnifiedScan(taskId: string, files: string[], options: ScanOptions): Promise<void> {
    const shardSize = options.shardSize || 15;
    const totalFiles = files.length;
    const shardCount = Math.ceil(totalFiles / shardSize);

    // 1. Shard Structural Checks (Fast)
    if (options.useStructure !== false) {
      for (let i = 0; i < shardCount; i++) {
        const shardFiles = files.slice(i * shardSize, (i + 1) * shardSize);
        await this.queue.enqueue({
          type: JobType.INTEGRITY_SHARD,
          payload: {
            correlationId: taskId,
            shardId: i,
            files: shardFiles,
            projectRoot: options.projectRoot,
          },
        });
      }
    }

    // 2. Shard Semantic Checks (Heavy)
    if (options.useSemantic) {
      // Semantic checks usually need more context, but can be sharded per-file
      for (let i = 0; i < totalFiles; i++) {
        await this.queue.enqueue({
          type: JobType.SEMANTIC_SHARD,
          payload: {
            taskId,
            file: files[i],
            projectRoot: options.projectRoot,
          },
        });
      }
    }
  }

  /**
   * Aggregates results from multiple shards into a single IntegrityReport.
   */
  aggregateResults(shardResults: IntegrityReport[], fileCount: number): IntegrityReport {
    const allViolations: IntegrityViolation[] = [];
    shardResults.forEach((r) => allViolations.push(...r.violations));

    // Deduplicate violations by content/type/file
    const seen = new Set<string>();
    const uniqueViolations = allViolations.filter((v) => {
      const key = `${v.type}:${v.file}:${v.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      violations: uniqueViolations,
      scannedAt: new Date().toISOString(),
      fileCount,
    };
  }
}
