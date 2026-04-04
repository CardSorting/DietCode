/**
 * [LAYER: DOMAIN]
 * Principle: Pure model for File Context Tracking.
 * Inspired by Cline's Context Tracking (production hardening).
 */

export type FileState = 'active' | 'stale' | 'modified_externally' | 'deleted';

export type FileOperationSource =
  | 'read_tool'
  | 'user_edited'
  | 'codemarie_edited'
  | 'file_mentioned';

export interface FileMetadataEntry {
  path: string;
  state: FileState;
  source: FileOperationSource;
  lastReadDate: number | null;
  lastEditDate: number | null;
  externalEditDetected: boolean;
  signature?: string; // SHA-256 hash
}

export interface FileOperationEvent {
  path: string;
  source: FileOperationSource;
  timestamp: number;
  type: 'read' | 'edit' | 'delete' | 'detect_change';
}

/**
 * FileSignature
 * Pure contract for calculating and comparing file unique fingerprints.
 */
export interface FileSignature {
  hash: string;
  algorithm: 'sha256';
  timestamp: number;
  size: number;
}
