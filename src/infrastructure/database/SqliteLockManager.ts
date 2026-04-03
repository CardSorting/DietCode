import { LockManager } from './sovereign/LockManager';

/**
 * Legacy bridge for SqliteLockManager.
 * All new infrastructure should utilize the sovereign LockManager directly.
 */
export const SqliteLockManager = LockManager;
export default LockManager;
