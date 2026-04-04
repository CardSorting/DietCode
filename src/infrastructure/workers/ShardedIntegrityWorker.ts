/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Sharded Scanning Engine — Parallel file integrity verifier
 *
 **Purpose:** Worker script that runs in parallel threads to scan file shards
 **Spacing:** ~10MB per shard; 6-8 threads typical; ~2GB overall
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parentPort, workerData } from 'node:worker_threads';
import { IntegrityScanner } from '../../domain/integrity/IntegrityScanner';
import {
  type IntegrityReport,
  type IntegrityViolation,
  ViolationType,
} from '../../domain/memory/Integrity';
import { IntegrityPolicy } from '../../domain/memory/IntegrityPolicy';

interface ShardResult {
  shardId: number;
  success: boolean;
  score: number;
  violations: IntegrityViolation[];
  time: number;
  error?: string;
}

const policy = new IntegrityPolicy();

const scanner = {
  async scanFile(filePath: string, projectRoot: string): Promise<IntegrityReport> {
    const fullPath = path.resolve(projectRoot, filePath);
    const relPath = path.relative(projectRoot, fullPath);
    const violations: IntegrityViolation[] = [];

    if (!fs.existsSync(fullPath)) {
      return { score: 100, violations: [], scannedAt: new Date().toISOString() };
    }

    try {
      const fd = fs.openSync(fullPath, 'r');
      const buffer = Buffer.alloc(16384);
      fs.readSync(fd, buffer, 0, 16384, 0);
      fs.closeSync(fd);
      const content = buffer.toString('utf8');

      const rules = policy.getRulesForPath(relPath);
      for (const rule of rules) {
        if (content.match(rule.pattern)) {
          violations.push({
            id: crypto.randomUUID(),
            type: rule.type,
            file: relPath,
            message: rule.message,
            severity: rule.severity,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (e) {
      // Skip inaccessible files
    }

    return {
      score: Math.max(0, 100 - violations.length * 5),
      violations,
      scannedAt: new Date().toISOString(),
    };
  },
};

// No mock needed now

/**
 * ShardedIntegrityWorker: Implements scanning logic for individual partition
 *
 ** responsibilities:**
 * - Receives scanPartition request from WorkerPoolAdapter
 * - Scans all files in assigned partition
 * - Posts ShardResult to parent (WorkerPoolAdapter)
 */
try {
  const { shardId, files, projectRoot } = workerData;

  console.log(`🔍 Worker scanning ${files.length} files (shard #${shardId})`);
  const startTime = Date.now();

  const violations: IntegrityViolation[] = [];

  for (const file of files) {
    try {
      const fileResult = await scanner.scanFile(file, projectRoot);
      violations.push(...fileResult.violations);
    } catch (err) {
      console.error(`⚠️ Failed ${file}: ${err}`);
    }
  }

  const time = Date.now() - startTime;

  // Post result back to parent (WorkerPoolAdapter)
  parentPort?.postMessage({
    shardId,
    success: true,
    score: Math.max(0, 100 - violations.length * 5),
    violations,
    time,
  } as ShardResult);

  process.exit(0);
} catch (err) {
  const { shardId } = workerData;
  const time = 0;

  // Post failure result
  parentPort?.postMessage({
    shardId,
    success: false,
    score: 0,
    violations: [],
    time,
    error: String(err),
  } as ShardResult);

  process.exit(1);
}

/**
 * [OPTIONAL] Re-implementation with proper injector:
 * 
import { IntegrityScanner } from '../../../domain/integrity/IntegrityScanner';
import { WorkerPoolAdapter } from '../WorkerPoolAdapter';

// The WorkerPoolAdapter in parent spawns these workers
// So somehow we need to inject the scanner reference here

if (!scanner) {
  process.exit(1);
}
*/

// Pass 16: This is a stub for now - actual implementation would inject IntegrityScanner from parentervisor
