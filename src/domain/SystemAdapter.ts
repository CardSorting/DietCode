/**
 * [LAYER: DOMAIN]
 * Interface for gathering system and environment information.
 */

import type { SystemInfo, RepoContext } from './SystemContext';

export interface SystemAdapter {
  getSystemInfo(): Promise<SystemInfo>;
  getRepoContext(path: string): Promise<RepoContext>;
}
