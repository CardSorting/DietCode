/**
 * [LAYER: DOMAIN]
 * Principle: Pure model for state tracking (Snapshots).
 */

export interface Snapshot {
  id: string;
  path: string;
  content: string;
  timestamp: number;
  hash: string; // To avoid redundant snapshots
  mtime?: number; // File modification time for fast-check
}

export interface SnapshotRepository {
  /**
   * Persists a new snapshot of a file.
   */
  saveSnapshot(snapshot: Snapshot): Promise<void>;

  /**
   * Retrieves the most recent snapshot for a specific file path.
   */
  getLatestSnapshot(filePath: string): Promise<Snapshot | null>;

  /**
   * Retrieves a specific snapshot by its unique ID.
   */
  getSnapshotById(id: string): Promise<Snapshot | null>;

  /**
   * Cleans up snapshots older than a specific date.
   */
  cleanup(beforeTimestamp: number): Promise<void>;
}
