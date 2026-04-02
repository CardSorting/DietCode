/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic contracts for state recovery — testable in isolation
 * Prework Status: 
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - [FINALIZE] Implements RollbackAwareSafetyOrchestrator for Core integration
 */

import type { ApprovalRequirements } from './RiskLevel';

/**
 * Enum for rollback operation types
 */
export enum RollbackOperationType {
  FILE = 'FILE',
  CONFIGURATION = 'CONFIGURATION',
  DATABASE = 'DATABASE',
  SNAPSHOT = 'SNAPSHOT'
}

/**
 * Enum for restore operation results
 */
export enum RestoreResult {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED'
}

/**
 * Represents a backup of system state before an operation
 */
export interface Backup {
  id: string;
  type: 'FILE' | 'DATABASE' | 'SYSTEM' | 'CONFIG' | 'SNAPSHOT';
  path?: string;
  content?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Operation to restore state from a backup
 */
export interface RollbackOperation {
  /**
   * Execute the rollback operation
   */
  restore(): Promise<void>;
  
  /**
   * Get information about this rollback operation
   */
  getRestoreCount(): number;
  
  /**
   * Preview what would be restored
   */
  preview(): string;
}

/**
 * Domain contract for rollback capabilities
 * Services that can restore system state should implement this interface
 */
export interface RollbackProtocol {
  /**
   * Create a backup of a file before modification
   * Returns the backup information
   */
  backupFile(path: string, content: string, reason?: string): Promise<Backup>;

  /**
   * Create a backup of configuration state
   * Returns the backup information
   */
  backupConfiguration(state: any, reason?: string): Promise<Backup>;

  /**
   * Execute rollback for specific backup
   * @param backup The backup to restore
   * @returns Number of remaining backups after rollback
   */
  rollback(backup: Backup): Promise<number>;

  /**
   * Execute rollback for all backups related to a specific path
   * @param path The file or directory path
   * @returns Number of backups restored
   */
  rollbackByPath(path: string): Promise<number>;

  /**
   * Execute full rollback - undo all backups in reverse order
   * Used when a task is completely cancelled or failed
   */
  fullRollback(): Promise<void>;

  /**
   * Get rollback operations available for a specific path
   * @param path The file or directory path
   * @returns Array of RollbackOperation instances
   */
  getRollbackOptions(path: string): Promise<RollbackOperation[]>;

  /**
   * Check if a backup exists for the given path
   * @param path The file or directory path
   * @returns True if backup exists, false otherwise
   */
  hasBackup(path: string): Promise<boolean>;

  /**
   * Get approval requirements for rollback operations
   * Called by SafetyGuard to determine if rollback should be prepared
   * @param criteria Risk evaluation criteria
   * @returns Approval requirements including rollback necessity
   */
  getApprovalRequirementsForRollback(criteria?: any): Promise<ApprovalRequirements>;

  /**
   * Clear all stored backups
   * Should be called after successful operation completion
   */
  clear(): Promise<void>;
}

/**
 * Domain contract for rollback-aware safety orchestration
 * Coordination layer interface for RollbackProtocol integration
 */
export interface RollbackAwareSafetyOrchestrator {
  /**
   * Enable rollback capabilities with backup preparation
   */
  enableRollback(rollbackProtocol: RollbackProtocol): Promise<void>;

  /**
   * Execute operation with automatic backup and rollback preparation
   */
  executeWithRollback<T>(
    operation: () => Promise<T>,
    operationContext?: any,
    safetyPreparation?: boolean
  ): Promise<{ result: T; rollbackTriggered: boolean }>;

  /**
   * Determine if rollback is required based on operation outcome
   */
  shouldPrepareRollback(operationResult?: any, riskLevel?: string): Promise<boolean>;
}