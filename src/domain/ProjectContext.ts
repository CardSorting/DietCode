/**
 * [LAYER: DOMAIN]
 * Principle: Pure model for project and repository context.
 */

export interface ProjectContext {
  workspaceId: string;
  repoId: string;
  repoPath: string;
  defaultBranch: string;
}
