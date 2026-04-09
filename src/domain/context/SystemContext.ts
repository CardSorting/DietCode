/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Standardized types for environmental and system context discovery.
 */

export interface SystemInfo {
  os: {
    platform: string;
    release: string;
    arch: string;
    cpus: number;
    uptime: number;
  };
  runtime: {
    nodeVersion: string;
    shell?: string;
    cwd: string;
  };
}

export interface RepoContext {
  git?: {
    branch?: string;
    dirty?: boolean;
    lastCommitHash?: string;
  };
  dependencies: Record<string, string>;
  projectRoot: string;
}

export interface DetailedProjectContext {
  system: SystemInfo;
  repo: RepoContext;
}

export interface ExtensionStat {
  extension: string;
  count: number;
  percentage: string;
}

export interface SystemContext {
  cwd: string;
  filesSummary: {
    stats: ExtensionStat[];
    totalFiles: number;
  };
  activeBranch?: string;
  availableSkills: string[];
  toolsEnabled: boolean;
}
