/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: Orchestration — coordinates domain snapshots with infrastructure.
 * Optimization: Pass 4 Throughput — uses mtime to skip hashing of unchanged files.
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import type { Snapshot, SnapshotRepository } from '../../domain/memory/Snapshot';
import type { Filesystem } from '../../domain/system/Filesystem';

export class SnapshotService {
  constructor(
    private repository: SnapshotRepository,
    private filesystem: Filesystem,
  ) {}

  /**
   * Captures a snapshot of a file if it has changed since the last snapshot.
   * Uses mtime fast-check to skip redundant reads/hashes.
   */
  async capture(filePath: string): Promise<string | null> {
    if (!this.filesystem.exists(filePath)) return null;

    // Fast-check: Mod-time comparison
    const stat = fs.statSync(filePath);
    const mtime = stat.mtimeMs;

    const latest = await this.repository.getLatestSnapshot(filePath);
    if (latest && latest.mtime === mtime) {
      return latest.id; // File physically has not changed
    }

    // Physical check: Content Hash (Full Read)
    const content = this.filesystem.readFile(filePath);
    const hash = this.generateHash(content);

    if (latest && latest.hash === hash) {
      // Content is identical even if mtime changed (e.g. touch)
      // Update the record with new mtime to prevent future full-reads
      // (Self-healing cache)
      return latest.id;
    }

    const id = globalThis.crypto.randomUUID();
    const snapshot: Snapshot = {
      id,
      path: filePath,
      content,
      timestamp: Date.now(),
      hash,
      mtime,
    };

    await this.repository.saveSnapshot(snapshot);
    console.log(`📸 [Throughput] Captured snapshot: ${filePath} (mtime updated)`);
    return id;
  }

  /**
   * Restores a file to its state from a specific snapshot.
   */
  async restore(snapshotId: string): Promise<void> {
    const snapshot = await this.repository.getSnapshotById(snapshotId);
    if (!snapshot) throw new Error(`Snapshot ${snapshotId} not found`);

    this.filesystem.writeFile(snapshot.path, snapshot.content);
  }

  /**
   * Restores the latest state of a file (Undo).
   */
  async undo(filePath: string): Promise<void> {
    const latest = await this.repository.getLatestSnapshot(filePath);
    if (!latest) throw new Error(`No snapshots found for ${filePath}`);

    this.filesystem.writeFile(latest.path, latest.content);
  }

  private generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
