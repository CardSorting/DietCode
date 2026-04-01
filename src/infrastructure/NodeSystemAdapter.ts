/**
 * [LAYER: INFRASTRUCTURE]
 * Concrete implementation of SystemAdapter using Node.js APIs and shell commands.
 */

import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import type { SystemAdapter } from '../domain/system/SystemAdapter';
import type { SystemInfo, RepoContext } from '../domain/context/SystemContext';
import type { Filesystem } from '../domain/system/Filesystem';

export class NodeSystemAdapter implements SystemAdapter {
  constructor(private filesystem: Filesystem) {}

  async getSystemInfo(): Promise<SystemInfo> {
    return {
      os: {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        cpus: os.cpus().length,
        uptime: os.uptime(),
      },
      runtime: {
        nodeVersion: process.version,
        shell: process.env.SHELL || 'unknown',
        cwd: process.cwd(),
      },
    };
  }

  async getRepoContext(projectRoot: string): Promise<RepoContext> {
    let git: RepoContext['git'] = undefined;

    try {
      if (this.filesystem.exists(path.join(projectRoot, '.git'))) {
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: projectRoot }).toString().trim();
        const dirty = execSync('git status --porcelain', { cwd: projectRoot }).toString().trim().length > 0;
        const hash = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim();
        
        git = { branch, dirty, lastCommitHash: hash };
      }
    } catch (e) {
      console.warn('[INFRA] Failed to gather git context', e);
    }

    let dependencies: Record<string, string> = {};
    const pkgPath = path.join(projectRoot, 'package.json');
    if (this.filesystem.exists(pkgPath)) {
      try {
        const pkg = JSON.parse(this.filesystem.readFile(pkgPath));
        dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
      } catch (e) {
        console.warn('[INFRA] Failed to parse package.json', e);
      }
    }

    return {
      git,
      dependencies,
      projectRoot,
    };
  }
}
