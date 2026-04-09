/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: Application orchestration — coordinates Domain and Infrastructure
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 * Triaging:
 *   - [CONSOLIDATE] Imported separately - no conflicts with infrastructure module
 */

import type {
  Backup as DomainBackup,
  RollbackOperation as DomainRollbackOperation,
  RollbackProtocol as DomainRollbackProtocol,
} from '../../domain/validation/RollbackProtocol';
