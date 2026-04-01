import * as path from 'path';
import type { ProjectContext } from '../domain/ProjectContext';
import type { Filesystem } from '../domain/Filesystem';

export class DiscoveryService {
  constructor(private filesystem: Filesystem) {}

  /**
   * Discovers the project context starting from a given directory.
   */
  async discover(startDir: string): Promise<ProjectContext> {
    const root = this.findRepoRoot(startDir);
    const name = path.basename(root);
    
    return {
      workspace: {
        id: `workspace-${name}`,
        path: root,
        name: name,
      },
      repository: {
        id: `repo-${name}`,
        workspaceId: `workspace-${name}`,
        name: name,
        path: root,
        defaultBranch: 'main',
      }
    };
  }

  private findRepoRoot(currentDir: string): string {
    let current = path.resolve(currentDir);
    while (current !== path.parse(current).root) {
      if (this.filesystem.exists(path.join(current, '.git')) || this.filesystem.exists(path.join(current, 'package.json'))) {
        return current;
      }
      current = path.dirname(current);
    }
    return currentDir;
  }
}
