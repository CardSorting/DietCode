/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Atomicity — groups multiple filesystem changes into a single transaction.
 * Implementation: Transactional staging with rollback support.
 */

import * as path from 'node:path';
import type { LogService } from '../domain/logging/LogService';
import type { Filesystem } from '../domain/system/Filesystem';
import type { RollbackManager } from './validation/RollbackManager';
import { LockOrchestrator, NamedLockScopes } from '../core/manager/LockOrchestrator';
import type { LockTicket } from '../domain/safety/LockScope';

export type TransactionChangeType = 'WRITE' | 'DELETE' | 'RENAME';

export interface TransactionChange {
  type: TransactionChangeType;
  path: string;
  previousContent?: string;
  newContent?: string;
  oldPath?: string; // used for RENAME
}

export class TransactionManager {
  private activeTransaction: TransactionChange[] = [];
  private isTransactionActive = false;
  private acquiredLocks: LockTicket[] = [];
  private lockOrchestrator = LockOrchestrator.getInstance();
  private transactionId = `tx-${crypto.randomUUID()}`;

  constructor(
    private filesystem: Filesystem,
    private rollbackManager: RollbackManager,
    private logService: LogService,
  ) {}

  /**
   * Starts a new transaction.
   */
  startTransaction(): void {
    if (this.isTransactionActive) {
      throw new Error('Transaction already in progress');
    }
    this.activeTransaction = [];
    this.acquiredLocks = [];
    this.isTransactionActive = true;
    this.transactionId = `tx-${crypto.randomUUID()}`;
    this.logService.info(`[TRANSACTION] Started ${this.transactionId}`, {}, { component: 'TransactionManager' });
  }

  /**
   * Records a write operation in the current transaction.
   */
  async stageWrite(filePath: string, content: string): Promise<void> {
    this.ensureTransaction();

    // Pass 19: Acquire distributed lock for safety
    const lock = await this.lockOrchestrator.acquire(NamedLockScopes.FILE_WRITE(this.transactionId, filePath));
    this.acquiredLocks.push(lock);

    const exists = this.filesystem.exists(filePath);
    let previousContent: string | undefined;
    if (exists) {
      previousContent = this.filesystem.readFile(filePath);
    }
    
    // Track both existing content (for restoration) and non-existence (for purging)
    await (this.rollbackManager as any).backupFile(filePath, previousContent || null, 'Transaction write', exists);

    this.activeTransaction.push({
      type: 'WRITE',
      path: filePath,
      previousContent,
      newContent: content,
    });
  }

  /**
   * Records a delete operation in the current transaction.
   */
  async stageDelete(filePath: string): Promise<void> {
    this.ensureTransaction();

    // Pass 19: Acquire distributed lock for safety
    const lock = await this.lockOrchestrator.acquire(NamedLockScopes.FILE_WRITE(this.transactionId, filePath));
    this.acquiredLocks.push(lock);

    if (this.filesystem.exists(filePath)) {
      const previousContent = this.filesystem.readFile(filePath);
      await (this.rollbackManager as any).backupFile(
        filePath,
        previousContent,
        'Transaction delete',
        true
      );

      this.activeTransaction.push({
        type: 'DELETE',
        path: filePath,
        previousContent,
      });
    }
  }

  /**
   * Commits the current transaction, applying all changes.
   */
  async commit(): Promise<void> {
    this.ensureTransaction();

    this.logService.info(
      `[TRANSACTION] Committing ${this.activeTransaction.length} changes...`,
      { count: this.activeTransaction.length },
      { component: 'TransactionManager' },
    );

    try {
      for (const change of this.activeTransaction) {
        if (change.type === 'WRITE' && change.newContent !== undefined) {
          this.filesystem.writeFile(change.path, change.newContent);
        } else if (change.type === 'DELETE') {
          await this.filesystem.unlink(change.path);
        }
      }
      this.logService.info(
        `[TRANSACTION] ${this.transactionId} Committed successfully`,
        {},
        { component: 'TransactionManager' },
      );
    } catch (error: any) {
      this.logService.error(
        `[TRANSACTION] ${this.transactionId} Commit failed: ${error.message}. Rolling back...`,
        error,
        { component: 'TransactionManager' },
      );
      await this.rollback();
      throw error;
    } finally {
      await this.rollbackManager.clear();
      await this.cleanupLocks();
      this.isTransactionActive = false;
      this.activeTransaction = [];
    }
  }

  /**
   * Aborts the current transaction and rolls back any backups.
   */
  async rollback(): Promise<void> {
    this.logService.info(`[TRANSACTION] ${this.transactionId} Rolling back...`, {}, { component: 'TransactionManager' });
    await this.rollbackManager.fullRollback();
    await this.cleanupLocks();
    this.isTransactionActive = false;
    this.activeTransaction = [];
  }

  private async cleanupLocks(): Promise<void> {
    for (const lock of this.acquiredLocks) {
      try {
        await this.lockOrchestrator.release(lock.resourceId, lock.code);
      } catch (e) {
        this.logService.error('Failed to release transaction lock', e, { component: 'TransactionManager' });
      }
    }
    this.acquiredLocks = [];
  }

  private ensureTransaction(): void {
    if (!this.isTransactionActive) {
      throw new Error('No active transaction. Call startTransaction() first.');
    }
  }
}
