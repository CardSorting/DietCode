import * as path from 'node:path';
import { EventType } from '../../domain/Event';
import type { ProjectContext } from '../../domain/context/ProjectContext';
import type { LogService } from '../../domain/logging/LogService';
import type { Filesystem } from '../../domain/system/Filesystem';
import type { SystemAdapter } from '../../domain/system/SystemAdapter';
import { defaultCapabilityRegistry } from '../capabilities/CapabilityRegistry';
import { EventBus } from '../orchestration/EventBus';

/**
 * [LAYER: CORE]
 * Principle: Application orchestration — coordinates domain logic with infrastructure.
 */

export class DiscoveryService {
  private eventBus: EventBus;

  constructor(
    private filesystem: Filesystem,
    private systemAdapter: SystemAdapter,
    logService: LogService,
  ) {
    this.eventBus = EventBus.getInstance(logService);
  }

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
      branch: repoContext.git?.branch,
    });

    await this.performDeepDiscovery();

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
      },
    };
  }

  private findRepoRoot(currentDir: string): string {
    let current = path.resolve(currentDir);
    while (current !== path.parse(current).root) {
      if (
        this.filesystem.exists(path.join(current, '.git')) ||
        this.filesystem.exists(path.join(current, 'package.json'))
      ) {
        return current;
      }
      current = path.dirname(current);
    }
    return currentDir;
  }

  private async performDeepDiscovery(): Promise<void> {
    const registry = defaultCapabilityRegistry;
    const coreCapabilities = [
      { name: 'git', cmd: 'git --version' },
      { name: 'node', cmd: 'node --version' },
      { name: 'npm', cmd: 'npm --version' },
      { name: 'docker', cmd: 'docker --version' },
      { name: 'bun', cmd: 'bun --version' },
    ];

    for (const cap of coreCapabilities) {
      const result = await this.systemAdapter.detectCapability(cap.name, cap.cmd);
      registry.register({
        name: cap.name,
        available: result.available,
        version: result.version,
      });
    }

    this.eventBus.emit(EventType.SYSTEM_INFO_GATHERED, {
      component: 'DiscoveryService',
      message: `Deep discovery complete: ${registry.getAll().filter((c) => c.available).length} capabilities found`,
    });
  }
}
