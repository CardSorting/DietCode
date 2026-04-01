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
