/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { LockManager } from './sovereign/LockManager';

/**
 * Legacy bridge for SqliteLockManager.
 * All new infrastructure should utilize the sovereign LockManager directly.
 */
export const SqliteLockManager = LockManager;
export default LockManager;
