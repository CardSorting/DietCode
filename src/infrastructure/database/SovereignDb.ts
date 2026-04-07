/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { Core } from './sovereign/Core';

/**
 * Legacy bridge for SovereignDb.
 * All new infrastructure should utilize the Core hive orchestrator directly.
 */
export const SovereignDb = Core;
export default Core;
