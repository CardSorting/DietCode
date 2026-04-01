/**
 * [LAYER: CORE]
 * Principle: Orchestration — coordinates domain snapshots with infrastructure.
 */

import * as crypto from 'node:crypto';
import type { Snapshot, SnapshotRepository } from '../domain/Snapshot';
import type { Filesystem } from '../domain/Filesystem';

export class SnapshotService {
  constructor(
    private repository: SnapshotRepository,
    private filesystem: Filesystem
  ) {}

  /**
   * Captures a snapshot of a file if it has changed since the last snapshot.
   */
  async capture(filePath: string): Promise<string | null> {
    if (!this.filesystem.exists(filePath)) return null;

    const content = this.filesystem.readFile(filePath);
    const hash = this.generateHash(content);
    
    const latest = await this.repository.getLatestSnapshot(filePath);
    if (latest && latest.hash === hash) {
      return latest.id; // Already have this state
    }

    const id = globalThis.crypto.randomUUID();
    const snapshot: Snapshot = {
      id,
      path: filePath,
      content,
      timestamp: Date.now(),
      hash,
    };

    await this.repository.saveSnapshot(snapshot);
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
