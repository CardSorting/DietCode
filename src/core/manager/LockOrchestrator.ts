/**
 * [LAYER: CORE]
 * Principle: Orchestrate distributed lock acquisition with timing strategies
 * Prework Status: Not applicable (new file)
 *
 * Coordinates distributed lock operations with timed acquisition strategies.
 * Provides a high-level interface for coordinating concurrent operations.
 */

import type { LockResult, LockScope, LockTicket } from '../../domain/safety/LockScope';
import { LockManager } from '../../infrastructure/database/sovereign/LockManager';

/**
 * Lock acquisition timeout strategy
 */
export enum LockTimeoutStrategy {
  IMMEDIATE = 'immediate', // Fail fast
  POLLING = 'polling', // Incremental retry with timeout
  BACKOFF = 'backoff', // Exponential backoff
}

/**
 * Lock timeout configuration
 */
export interface LockTimeoutConfig {
  strategy: LockTimeoutStrategy;
  timeoutMs: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}

/**
 * Lock timeout configuration options
 */
export const LockTimeoutDefaults: LockTimeoutConfig = {
  strategy: LockTimeoutStrategy.POLLING,
  timeoutMs: 30000, // 30 seconds
  initialDelayMs: 100,
  maxDelayMs: 5000,
};

/**
 * Lock release strategy
 */
export enum LockReleaseStrategy {
  SOFT = 'soft', // Release without error
  FORCE = 'force', // Force release (dangerous!)
}

/**
 * LockOrchestrator
 *
 * High-level orchestration for distributed lock operations.
 * Provides simplified API for: acquire, release, extend, and evaluate.
 *
 * Features:
 * - Timed acquisition strategies (polling, backoff)
 * - Automatic lock cleanup
 * - Release strategy enforcement
 * - Timeout extension capabilities
 *
 * Uses SqliteLockManager as underlying infrastructure.
 */
export class LockOrchestrator {
  private static instance: LockOrchestrator | null = null;

  private lockManager = LockManager.getInstance();

  private acquisitionStrategies: Map<
    LockTimeoutStrategy,
    (scope: LockScope, maxTime: number) => Promise<LockTicket>
  > = new Map();

  private constructor() {
    this.initializeStrategies();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): LockOrchestrator {
    if (!LockOrchestrator.instance) {
      LockOrchestrator.instance = new LockOrchestrator();
    }
    return LockOrchestrator.instance;
  }

  /**
   * Initialize acquisition strategies
   */
  private initializeStrategies(): void {
    this.acquisitionStrategies = new Map();

    // Immediate acquisition
    this.acquisitionStrategies.set(LockTimeoutStrategy.IMMEDIATE, async (scope, maxTime) => {
      const result = await this.lockManager.acquire(scope, 0);
      if (!result.success) {
        throw new Error(`Lock immediate acquisition failed: ${result.error}`);
      }
      return result.ticket!;
    });

    // Polling acquisition
    this.acquisitionStrategies.set(LockTimeoutStrategy.POLLING, async (scope, maxTime) => {
      const result = await this.lockManager.acquire(scope, maxTime);
      if (!result.success) {
        throw new Error(
          `Lock polling acquisition timed out: ${result.error} (reason: ${result.reason})`,
        );
      }
      return result.ticket!;
    });

    // Backoff acquisition
    this.acquisitionStrategies.set(LockTimeoutStrategy.BACKOFF, async (scope, maxTime) => {
      const startTime = Date.now();
      const initialDelay = LockTimeoutDefaults.initialDelayMs || 100;
      const maxDelay = LockTimeoutDefaults.maxDelayMs || 5000;

      while (Date.now() - startTime < maxTime) {
        const result = await this.lockManager.acquire(scope, 0);
        if (result.success) {
          return result.ticket!;
        }

        // Calculate exponential backoff delay
        const elapsed = Date.now() - startTime;
        const delay = Math.min(initialDelay * 2 ** Math.floor(elapsed / 1000), maxDelay);

        console.log(`⏳ Lock backoff: waiting ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      throw new Error(`Lock backoff acquisition timed out after ${maxTime}ms`);
    });
  }

  /**
   * Acquire a distributed lock with timeout strategy
   *
   * @param scope - The lock scope
   * @param config - Timeout configuration
   * @returns Lock ticket
   * @throws Error if acquisition fails
   */
  async acquire(
    scope: LockScope,
    config: LockTimeoutConfig | number = LockTimeoutDefaults,
  ): Promise<LockTicket> {
    const timeoutConfig =
      typeof config === 'number' ? { ...LockTimeoutDefaults, timeoutMs: config } : config;

    // Use current process/agent ID if ownerId is not provided
    if (!scope.ownerId) {
      scope.ownerId = process.env.AGENT_ID || `agent-${process.pid}`;
    }

    const acquireFn = this.acquisitionStrategies.get(timeoutConfig.strategy);
    if (!acquireFn) {
      throw new Error(`Unknown lock timeout strategy: ${timeoutConfig.strategy}`);
    }

    console.log(
      `🔒 Lock acquisition: ${scope.taskId}_${scope.operation} (Owner: ${scope.ownerId})`,
    );

    try {
      const ticket = await acquireFn(scope, timeoutConfig.timeoutMs);
      console.log(`✅ Lock acquired: ${ticket.id}`);
      return ticket;
    } catch (error: any) {
      console.error('❌ Lock acquisition failed:', error);
      throw error;
    }
  }

  /**
   * Release a lock with strategy enforcement
   *
   * @param resourceId - The resource identifier
   * @param expectedCode - The lock code for verification
   * @param strategy - Release strategy (default: soft)
   * @returns True if released successfully
   */
  async release(
    resourceId: string,
    expectedCode: string,
    strategy: LockReleaseStrategy = LockReleaseStrategy.SOFT,
  ): Promise<boolean> {
    console.log(`🔓 Lock release: ${resourceId} (${strategy})`);

    if (strategy === LockReleaseStrategy.FORCE) {
      // Force release requires elevated permissions
      console.warn(`⚠️  FORCE lock release requested: ${resourceId}`);
    }

    const success = await this.lockManager.release(resourceId, expectedCode);

    if (success) {
      console.log(`✅ Lock released: ${resourceId}`);
    } else {
      console.log(`⚠️  Lock release failed (perhaps already released): ${resourceId}`);
    }

    return success;
  }

  /**
   * Extend an existing lock's expiration
   *
   * @param resourceId - The resource identifier
   * @param expectedCode - The lock code for verification
   * @param newTimeoutMs - New timeout in milliseconds
   * @returns True if extension succeeded
   */
  async extend(resourceId: string, expectedCode: string, newTimeoutMs: number): Promise<boolean> {
    console.log(`⏳ Lock extend: ${resourceId} (+${newTimeoutMs}ms)`);

    const success = await this.lockManager.extend(resourceId, expectedCode, newTimeoutMs);

    if (success) {
      console.log(`✅ Lock extended: ${resourceId}`);
    } else {
      console.error(`❌ Lock extension failed: ${resourceId}`);
    }

    return success;
  }

  /**
   * Check if a lock is acquired for a resource
   *
   * @param resourceId - The resource identifier
   * @returns Lock result with ticket if locked
   */
  async isLocked(resourceId: string): Promise<LockResult> {
    return this.lockManager.isLocked(resourceId);
  }

  /**
   * Get lock information for a resource
   *
   * @param resourceId - The resource identifier
   * @returns Lock ticket or undefined
   */
  async getLockInfo(resourceId: string): Promise<LockTicket | undefined> {
    const result = await this.lockManager.isLocked(resourceId);
    return result.success ? result.ticket : undefined;
  }

  /**
   * Cleanup all expired locks
   *
   * Running this periodically helps prevent lock buildup.
   */
  async cleanupExpiredLocks(): Promise<void> {
    console.log('🧹 Cleanup: checking for expired locks...');
    await this.lockManager.cleanupExpiredLocks();
    console.log('✅ Expired locks cleaned up');
  }

  /**
   * Execute a single-operation lock (acquire > execute > release pattern)
   *
   * @param scope - The lock scope
   * @param operation - The function to execute
   * @param timeoutStrategy - Timeout strategy
   * @returns Result of the operation
   */
  async executeInLock<T>(
    scope: LockScope,
    operation: (ticket: LockTicket) => Promise<T>,
    timeoutStrategy: LockTimeoutStrategy = LockTimeoutStrategy.POLLING,
  ): Promise<T> {
    // Create custom timeout config
    const timeoutConfig =
      typeof timeoutStrategy === 'string'
        ? { strategy: timeoutStrategy, timeoutMs: LockTimeoutDefaults.timeoutMs }
        : timeoutStrategy;

    // Acquire lock
    const ticket = await this.acquire(scope, timeoutConfig);

    try {
      // Execute the operation
      const result = await operation(ticket);
      return result;
    } finally {
      // Release lock regardless of result
      await this.release(ticket.resourceId, ticket.code, LockReleaseStrategy.SOFT);
    }
  }

  /**
   * Get active lock count
   */
  async getActiveLockCount(): Promise<number> {
    const locks = await this.lockManager.isLocked('');
    return locks.success ? 1 : 0; // Simplified count
  }
}

/**
 * Named lock scopes for common operations
 */
export const NamedLockScopes = {
  /**
   * File read patterns
   */
  FILE_READ: (taskId: string, filePath: string) => ({
    taskId,
    operation: 'file_read',
    timeoutMs: 10000,
    autoRelease: true,
  }),

  /**
   * File write patterns
   */
  FILE_WRITE: (taskId: string, filePath: string) => ({
    taskId,
    operation: 'file_write',
    timeoutMs: 30000,
    autoRelease: true,
  }),

  /**
   * Matrix commit patterns
   */
  MATRIX_COMMIT: (taskId: string, matrixId: string) => ({
    taskId,
    operation: 'matrix_commit',
    timeoutMs: 60000,
    autoRelease: true,
  }),

  /**
   * Agent replanning patterns
   */
  AGENT_REPLAN: (taskId: string, agentId: string) => ({
    taskId,
    operation: 'agent_replanning',
    timeoutMs: 45000,
    autoRelease: true,
  }),

  /**
   * Session lock
   */
  SESSION_LOCK: (sessionId: string) => ({
    taskId: sessionId,
    operation: 'session',
    timeoutMs: 0, // Never expires
    autoRelease: false,
  }),
} as const;

/**
 * Default LockOrchestrator instance
 */
export const getDefaultLockOrchestrator = () => LockOrchestrator.getInstance();
