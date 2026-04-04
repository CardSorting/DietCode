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
