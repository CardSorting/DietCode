/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Define safety scopes for distributed locking
 */

/**
 * Lock scope definition
 */
export interface LockScope {
  /**
   * Task identifier (or session identifier)
   */
  taskId: string;

  /**
   * Operation identifier (what is being locked)
   */
  operation: string;

  /**
   * Time in milliseconds for the lock to expire automatically (0 = no expiry)
   */
  timeoutMs?: number;

  /**
   * Whether to automatically release the lock when the process exits
   */
  autoRelease?: boolean;

  /**
   * Optional owner identifier (the agent instance owning the lock)
   */
  ownerId?: string;
}

/**
 * Lock ticket (Re-exported for convenience)
 */
export interface LockTicket {
  id: string;
  code: string;
  resourceId: string;
  acquiredAt: number;
  expiresAt: number;
  sessionId?: string;
  autoRelease: boolean;
  ownerId?: string;
}

/**
 * Lock acquisition result
 */
export interface LockResult {
  /**
   * Whether the lock was acquired successfully
   */
  success: boolean;

  /**
   * The lock ticket if successful
   */
  ticket?: LockTicket;

  /**
   * Error message if failed
   */
  error?: string;

  /**
   * Failure reason
   */
  reason?: 'already_locked' | 'expired' | 'invalid_scope' | 'timeout' | 'unlocked';
}
