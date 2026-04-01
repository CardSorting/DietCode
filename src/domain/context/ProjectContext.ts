import type { DetailedProjectContext } from './SystemContext';

export interface Workspace {
  id: string;
  path: string;
  name: string;
}

export interface GitStatus {
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export interface Repository {
  id: string;
  workspaceId: string;
  name: string;
  path: string;
  defaultBranch: string;
  activeBranch?: string;
  status?: GitStatus;
}

/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic — the heart of the application.
 */

export interface ProjectContext {
  workspace: Workspace;
  repository: Repository;
  detailedContext?: DetailedProjectContext;
}
