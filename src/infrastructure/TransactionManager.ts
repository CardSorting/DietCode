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
    this.isTransactionActive = true;
    this.logService.info('[TRANSACTION] Started', {}, { component: 'TransactionManager' });
  }

  /**
   * Records a write operation in the current transaction.
   */
  async stageWrite(filePath: string, content: string): Promise<void> {
    this.ensureTransaction();

    let previousContent: string | undefined;
    if (this.filesystem.exists(filePath)) {
      previousContent = this.filesystem.readFile(filePath);
      await this.rollbackManager.backupFile(filePath, previousContent, 'Transaction backup');
    }

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

    if (this.filesystem.exists(filePath)) {
      const previousContent = this.filesystem.readFile(filePath);
      await this.rollbackManager.backupFile(
        filePath,
        previousContent,
        'Transaction backup before delete',
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
        '[TRANSACTION] Committed successfully',
        {},
        { component: 'TransactionManager' },
      );
    } catch (error: any) {
      this.logService.error(
        `[TRANSACTION] Commit failed: ${error.message}. Rolling back...`,
        error,
        { component: 'TransactionManager' },
      );
      await this.rollback();
      throw error;
    } finally {
      this.isTransactionActive = false;
      this.activeTransaction = [];
    }
  }

  /**
   * Aborts the current transaction and rolls back any backups.
   */
  async rollback(): Promise<void> {
    this.logService.info('[TRANSACTION] Rolling back...', {}, { component: 'TransactionManager' });
    await this.rollbackManager.fullRollback();
    this.isTransactionActive = false;
    this.activeTransaction = [];
  }

  private ensureTransaction(): void {
    if (!this.isTransactionActive) {
      throw new Error('No active transaction. Call startTransaction() first.');
    }
  }
}
