import * as path from 'path';
import type { ProjectContext } from '../../domain/context/ProjectContext';
import type { Filesystem } from '../../domain/system/Filesystem';
import type { SystemAdapter } from '../../domain/system/SystemAdapter';
import { EventBus } from '../orchestration/EventBus';
import { EventType } from '../../domain/Event';

/**
 * [LAYER: CORE]
 * Principle: Application orchestration — coordinates domain logic with infrastructure.
 */

export class DiscoveryService {
  private eventBus: EventBus = EventBus.getInstance();

  constructor(
    private filesystem: Filesystem,
    private systemAdapter: SystemAdapter
  ) {}

  /**
   * Discovers the project context starting from a given directory.
   */
  async discover(startDir: string): Promise<ProjectContext> {
    const root = this.findRepoRoot(startDir);
    const name = path.basename(root);
    
    const systemInfo = await this.systemAdapter.getSystemInfo();
    const repoContext = await this.systemAdapter.getRepoContext(root);

    this.eventBus.emit(EventType.SYSTEM_INFO_GATHERED, { 
      platform: systemInfo.os.platform,
      branch: repoContext.git?.branch 
    });

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
        activeBranch: repoContext.git?.branch,
      },
      detailedContext: {
        system: systemInfo,
        repo: repoContext,
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
