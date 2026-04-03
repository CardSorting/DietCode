import { randomUUID } from 'node:crypto';
import { Core } from './Core';
import type { LockScope, LockTicket, LockResult } from '../../../domain/safety/LockScope';

/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Distributed lock management using modular SQLite infrastructure.
 * 
 * Provides deterministic distributed locking capabilities for multi-process
 * safety, task-level isolation, and concurrent mutation coordination.
 * 
 * This is the hardened, modular successor to SqliteLockManager.
 */
export class LockManager {
  private static instance: LockManager | null = null;
  private locksCache = new Map<string, LockTicket>();

  private constructor() {}

  /**
   * Legacy initialization bridge.
   * Ensures the core hive is operational.
   */
  static async initialize(): Promise<void> {
    await Core.init();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): LockManager {
    if (!LockManager.instance) {
      LockManager.instance = new LockManager();
    }
    return LockManager.instance;
  }

  /**
   * Acquire a distributed lock.
   * Logic: Atomic upsert or check-and-insert with localized polling.
   */
  async acquire(
    scope: LockScope,
    timeoutMs: number = 30000
  ): Promise<LockResult> {
    const db = await Core.db();
    const resourceId = `${scope.taskId}_${scope.operation}`;
    
    // Generate unique ticket
    const ticket: LockTicket = {
      id: randomUUID(),
      code: randomUUID(),
      resourceId,
      acquiredAt: Date.now(),
      expiresAt: scope.timeoutMs ? Date.now() + scope.timeoutMs : Date.now() + 60000,
      sessionId: process.env.SESSION_ID || randomUUID(),
      autoRelease: scope.autoRelease !== false,
      ownerId: scope.ownerId || `agent-${process.pid}`
    };

    const startTime = Date.now();
    
    while (true) {
      const result = await this.tryAcquireImmediate(db, ticket, resourceId);
      if (result.success) {
        return result;
      }
      
      const elapsed = Date.now() - startTime;
      if (timeoutMs === 0 || elapsed >= timeoutMs) {
        return result; // Return the last failure (likely already_locked or timeout)
      }
      
      // Wait before retry (100ms polling)
      await new Promise(resolve => setTimeout(resolve, 100));
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
    const now = Date.now();

    // 1. Cleanup/Check existing lock
    const existing = await (db as any)
      .selectFrom('locks')
      .selectAll()
      .where('resource', '=', resourceId)
      .executeTakeFirst();

    if (existing) {
      const isExpired = parseInt(existing.expires_at) < now;
      const isOwner = existing.owner_id === ticket.ownerId;

      if (!isExpired && !isOwner) {
        return {
          success: false,
          error: `Resource is currently locked by owner: ${existing.owner_id}`,
          reason: 'already_locked'
        };
      }

      // 2. Perform Takeover or Extension (Atomic Update)
      try {
        await (db as any).updateTable('locks')
          .set({
            owner_id: ticket.ownerId,
            lock_code: ticket.code,
            acquired_at: ticket.acquiredAt,
            expires_at: ticket.expiresAt
          })
          .where('resource', '=', resourceId)
          .where((eb: any) => eb.or([
            eb('expires_at', '<', now),
            eb('owner_id', '=', ticket.ownerId)
          ]))
          .execute();

        this.locksCache.set(resourceId, ticket);
        return { success: true, ticket };
      } catch (e) {
        return {
          success: false,
          error: 'Lock acquisition race condition during update',
          reason: 'already_locked'
        };
      }
    }

    // 3. New Lock Insertion
    try {
      await (db as any).insertInto('locks')
        .values({
          resource: resourceId,
          owner_id: ticket.ownerId,
          lock_code: ticket.code,
          acquired_at: ticket.acquiredAt,
          expires_at: ticket.expiresAt
        })
        .execute();

      this.locksCache.set(resourceId, ticket);
      return { success: true, ticket };
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint')) {
        return {
          success: false,
          error: 'Lock acquisition race condition during insert',
          reason: 'already_locked'
        };
      }
      throw error;
    }
  }

  /**
   * Release a lock.
   */
  async release(
    resourceId: string,
    expectedCode: string
  ): Promise<boolean> {
    const db = await Core.db();
    const result = await (db as any)
      .deleteFrom('locks')
      .where('resource', '=', resourceId)
      .where('lock_code', '=', expectedCode)
      .executeTakeFirst();

    const success = result.numDeletedRows > 0;
    if (success) {
      this.locksCache.delete(resourceId);
    }
    return success;
  }

  /**
   * Extend an existing lock.
   */
  async extend(
    resourceId: string,
    expectedCode: string,
    newTimeoutMs: number
  ): Promise<boolean> {
    const db = await Core.db();
    const newExpiresAt = Date.now() + newTimeoutMs;

    const result = await (db as any).updateTable('locks')
      .set({
        expires_at: newExpiresAt
      })
      .where('resource', '=', resourceId)
      .where('lock_code', '=', expectedCode)
      .executeTakeFirst();

    const success = result.numUpdatedRows > 0;
    if (success) {
      const cached = this.locksCache.get(resourceId);
      if (cached) cached.expiresAt = newExpiresAt;
    }
    return success;
  }

  /**
   * Check if a resource is locked.
   */
  async isLocked(resourceId: string): Promise<LockResult> {
    const now = Date.now();
    const db = await Core.db();
    
    const lock = await (db as any)
      .selectFrom('locks')
      .selectAll()
      .where('resource', '=', resourceId)
      .where('expires_at', '>', now)
      .executeTakeFirst();

    if (lock) {
      const ticket: LockTicket = {
        id: randomUUID(), // New ticket ID for info lookup
        code: lock.lock_code,
        resourceId: lock.resource,
        acquiredAt: parseInt(lock.acquired_at),
        expiresAt: parseInt(lock.expires_at),
        sessionId: 'unknown',
        autoRelease: true,
        ownerId: lock.owner_id
      };
      return { success: true, ticket };
    }

    return {
      success: false,
      reason: 'unlocked'
    };
  }

  /**
   * Cleanup expired locks.
   */
  async cleanupExpiredLocks(): Promise<void> {
    const db = await Core.db();
    const now = Date.now();

    await (db as any)
      .deleteFrom('locks')
      .where('expires_at', '<=', now)
      .execute();
      
    // Sync cache
    for (const [res, ticket] of this.locksCache.entries()) {
      if (ticket.expiresAt <= now) {
        this.locksCache.delete(res);
      }
    }
  }

  // Legacy static wrappers for backward compatibility during transition
  static async acquireLock(resource: string, owner: string, ttlMs = 60000): Promise<boolean> {
    const mgr = LockManager.getInstance();
    const result = await mgr.acquire({
      taskId: 'legacy',
      operation: resource,
      ownerId: owner,
      timeoutMs: ttlMs
    }, 0);
    return result.success;
  }

  static async releaseLock(resource: string, owner: string): Promise<void> {
    const mgr = LockManager.getInstance();
    // Legacy release didn't use codes, so we have to guess or check-and-delete
    const db = await Core.db();
    await (db as any).deleteFrom('locks')
      .where('resource', '=', `legacy_${resource}`)
      .where('owner_id', '=', owner)
      .execute();
  }
}
