/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Interface for gathering system and environment information.
 */

import type { RepoContext, SystemInfo } from '../context/SystemContext';

export interface SystemAdapter {
  getSystemInfo(): Promise<SystemInfo>;
  getRepoContext(path: string): Promise<RepoContext>;
  detectCapability(
    name: string,
    checkCommand: string,
  ): Promise<{ available: boolean; version?: string }>;
}
