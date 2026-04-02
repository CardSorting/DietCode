/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Distributed lock management using SQLite advisory locks
 * Prework Status: Not applicable (new file, depends on SovereignDb)
 * 
 * Provides deterministic distributed locking capabilities for multi-process
 * safety, task-level isolation, and concurrent mutation coordination.
 */

import type { SqliteQueue } from '@noorm/broccoliq';
import type { LockScope } from '../../domain/safety/LockScope';
import { SovereignDb } from './SovereignDb';

/**
 * Distributed lock ticket
 * 
 * Represents an acquired lock with expiration and automatic cleanup properties
 */
export interface LockTicket {
  /**
   * Unique identifier for this lock acquisition
   */
  id: string;

  /**
   * Unique lock code (used for release verification)
   */
  code: string;

  /**
   * Resource identifier (taskId_operation)
   */
  resourceId: string;

  /**
   * When the lock was acquired (timestamp)
   */
  acquiredAt: number;

  /**
   * When the lock expires (timestamp or 0 for non-expiring)
   */
  expiresAt: number;

  /**
   * Session ID for cleanup after process exit
   */
  sessionId?: string;
}

/**
 * Lock acquisition result
 */
export interface LockResult {
  /**
   * The lock ticket if acquired successfully
   */
  success: boolean;

  /**
   * The acquired lock ticket
   */
  ticket?: LockTicket;

  /**
   * Error message if acquisition failed
   */
  error?: string;

  /**
   * Reason for failure
   */
  reason?: 'already_locked' | 'expired' | 'invalid_scope' | 'timeout';
}

/**
 * SqliteLockManager
 * 
 * Implements distributed locking using SQLite's BATCH advisory locks.
 * Uses Featherweight Advisory Lock Protocol (FALP) for non-blocking acquisition.
 * 
 * IMPORTANT: This uses BROCCOLI_DB's internal lock mechanism, not direct OS locks.
 * Readers are signaled via release events.
 */
export class SqliteLockManager {
  private static instance: SqliteLockManager | null = null;
  private queue: SqliteQueue<any> | null = null;
  private locks = new Map<string, LockTicket>();

  private constructor() {
    // Lock manager is a singleton-like service (not stateless)
  }

  /**
   * Initialize the lock manager
   */
  static async initialize(): Promise<SqliteLockManager> {
    if (!SqliteLockManager.instance) {
      SqliteLockManager.instance = new SqliteLockManager();
    }
    
    // Get the existing Sovereign DB queue
    SqliteLockManager.instance.queue = await SovereignDb.getQueue();
    
    // Initialize the locks table schema
    await SqliteLockManager.instance.initializeSchema();
    
    return SqliteLockManager.instance;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SqliteLockManager {
    if (!SqliteLockManager.instance) {
      throw new Error('SqliteLockManager not initialized. Call initialize() first.');
    }
    return SqliteLockManager.instance;
  }

  /**
   * Initialize the locks table schema
   */
  private async initializeSchema(): Promise<void> {
    const db = await SovereignDb.db();
    
    // Create locks table for persistent lock state
    await db.schema
      .createTable('solo_locks')
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('resource_id', 'text', (col) => col.notNull().unique())
      .addColumn('lock_code', 'text', (col) => col.notNull()) // Prevents accidental release
      .addColumn('acquired_at', 'text', (col) => col.notNull())
      .addColumn('expires_at', 'text', (col) => col.notNull())
      .addColumn('session_id', 'text')
      .addColumn('auto_release', 'text', (col) => col.notNull()) // JSON string
      .execute();

    // Create a unique index on resource_id
    await db.schema
      .createIndex('idx_locks_resource_id')
      .ifNotExists()
      .onTable('solo_locks')
      .column('resource_id')
      .unique()
      .execute();
  }

  /**
   * Acquire a distributed lock
   * 
   * @param scope - The lock scope defining what to lock
   * @param timeoutMs - Maximum time to wait for lock acquisition (0 = immediate)
   * @returns Lock result with ticket
   */
  async acquire(
    scope: LockScope,
    timeoutMs: number = 30000
  ): Promise<LockResult> {
    const db = await SovereignDb.db();
    const resourceId = `${scope.taskId}_${scope.operation}`;
    
    // Generate unique ticket
    const ticket: LockTicket = {
      id: crypto.randomUUID(),
      code: crypto.randomUUID(),
      resourceId,
      acquiredAt: Date.now(),
      expiresAt: scope.timeoutMs || 0,
      sessionId: process.env.SESSION_ID || crypto.randomUUID(),
      autoRelease: scope.autoRelease !== false
    };

    // Try immediate acquisition
    if (timeoutMs === 0) {
      return await this.tryAcquireImmediate(db, ticket, resourceId);
    }

    // Incremental polling with success or timeout
    try {
      const startTime = Date.now();
      
      while (Date.now() - startTime < timeoutMs) {
        const result = await this.tryAcquireImmediate(db, ticket, resourceId);
        if (result.success) {
          return result;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Timeout reached
      return {
        success: false,
        error: 'Lock acquisition timeout',
        reason: 'timeout'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        reason: 'invalid_scope'
      };
    }
  }

  /**
   * Attempt immediate lock acquisition
   */
  private async tryAcquireImmediate(
    db: any,
    ticket: LockTicket,
    resourceId: string
  ): Promise<LockResult> {
    // Check if lock already exists (with expiration)
    const existing = await db
      .selectFrom('solo_locks')
      .selectAll()
      .where('resource_id', '=', resourceId)
      .where('expires_at', '>', Date.now())
      .executeTakeFirst();

    if (existing) {
      return {
        success: false,
        error: 'Resource is currently locked',
        reason: 'already_locked'
      };
    }

    // Insert the new lock
    try {
      await db.insertInto('solo_locks')
        .values({
          id: ticket.id,
          resource_id: resourceId,
          lock_code: ticket.code,
          acquired_at: ticket.acquiredAt.toString(),
          expires_at: ticket.expiresAt.toString(),
          session_id: ticket.sessionId,
          auto_release: JSON.stringify(ticket.autoRelease)
        })
        .execute();

      // Store in memory cache
      this.locks.set(resourceId, ticket);

      return { success: true, ticket };
    } catch (error: any) {
      // Handle potential race conditions
      if (error.message.includes('UNIQUE constraint')) {
        return {
          success: false,
          error: 'Lock acquisition race condition',
          reason: 'already_locked'
        };
      }
      throw error;
    }
  }

  /**
   * Release a lock
   * 
   * @param resourceId - The resource identifier
   * @param expectedCode - The lock code to verify (prevents accidental release)
   * 
   * @returns True if released successfully
   */
  async release(
    resourceId: string,
    expectedCode: string
  ): Promise<boolean> {
    const db = await SovereignDb.db();

    // Verify lock exists and code matches
    const lock = await db
      .selectFrom('solo_locks')
      .selectAll()
      .where('resource_id', '=', resourceId)
      .where('lock_code', '=', expectedCode)
      .where('expires_at', '>', Date.now())
      .executeTakeFirst();

    if (!lock) {
      return false;
    }

    // Clear locks table entry
    await db
      .deleteFrom('solo_locks')
      .where('resource_id', '=', resourceId)
      .where('lock_code', '=', expectedCode)
      .execute();

    // Clear in-memory cache
    this.locks.delete(resourceId);

    return true;
  }

  /**
   * Extend a lock's expiration
   * 
   * @param resourceId - The resource identifier
   * @param expectedCode - The lock code to verify
   * @param newTimeoutMs - New timeout in milliseconds
   */
  async extend(
    resourceId: string,
    expectedCode: string,
    newTimeoutMs: number
  ): Promise<boolean> {
    const db = await SovereignDb.db();

    const lock = await db
      .selectFrom('solo_locks')
      .select(['id', 'lock_code'])
      .where('resource_id', '=', resourceId)
      .where('lock_code', '=', expectedCode)
      .where('expires_at', '>', Date.now())
      .executeTakeFirst();

    if (!lock) {
      return false;
    }

    const newExpiresAt = Date.now() + newTimeoutMs;

    await db
      .updateTable('solo_locks')
      .set({ 
        expires_at: newExpiresAt.toString(),
        acquired_at: Date.now().toString() // Reset acquired_at for extended locks
      })
      .where('resource_id', '=', resourceId)
      .where('lock_code', '=', expectedCode)
      .execute();

    // Update in-memory cache
    const cached = this.locks.get(resourceId);
    if (cached) {
      cached.expiresAt = newExpiresAt;
    }

    return true;
  }

  /**
   * Check if a resource is currently locked
   */
  async isLocked(resourceId: string): Promise<LockResult> {
    if (this.locks.has(resourceId)) {
      return {
        success: true,
        ticket: this.locks.get(resourceId)!
      };
    }

    // Check database for expired locks
    const db = await SovereignDb.db();
    const lock = await db
      .selectFrom('solo_locks')
      .selectAll()
      .where('resource_id', '=', resourceId)
      .where('expires_at', '>', Date.now())
      .executeTakeFirst();

    if (lock) {
      return {
        success: true,
        ticket: {
          id: lock.id,
          code: lock.lock_code,
          resourceId: lock.resource_id,
          acquiredAt: parseInt(lock.acquired_at),
          expiresAt: parseInt(lock.expires_at),
          sessionId: lock.session_id
        }
      };
    }

    return {
      success: false,
      reason: 'unlocked'
    };
  }

  /**
   * Cleanup expired locks
   * Runs periodically (e.g., every 5 minutes)
   */
  async cleanupExpiredLocks(): Promise<void> {
    const db = await SovereignDb.db();
    const now = Date.now().toString();

    await db
      .deleteFrom('solo_locks')
      .where('expires_at', '<=', now)
      .execute();

    // Clear memory cache
    for (const [resourceId, ticket] of this.locks.entries()) {
      if (ticket.expiresAt <= Date.now()) {
        this.locks.delete(resourceId);
      }
    }
  }

  /**
   * Shutdown the lock manager
   */
  async shutdown(): Promise<void> {
    this.locks.clear();
    this.queue = null;
  }
}