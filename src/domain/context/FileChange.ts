/**
 * [LAYER: DOMAIN]
 * Type definitions for file system changes and tracking.
 */

export enum FileChangeType {
  ADDED = 'added',
  MODIFIED = 'modified',
  DELETED = 'deleted',
  RENAMED = 'renamed',
  UNLINK = 'unlink',
  ADD_DIR = 'add_dir',
  UNLINK_DIR = 'unlink_dir',
}

export interface FileChange {
  /**
   * Path of the affected file
   */
  path: string;

  /**
   * Type of change
   */
  type: FileChangeType;

  /**
   * Timestamp of the change
   */
  timestamp: number;

  /**
   * Previous path if renamed
   */
  oldPath?: string;
}
