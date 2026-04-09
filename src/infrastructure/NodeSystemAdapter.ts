/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Concrete implementation of SystemAdapter using Node.js APIs and shell commands.
 * Uses structured logging for production-grade observability.
 *
 * Implements ForgeFS-inspired binary detection support through enhanced Filesystem adapter.
 */

import { execSync } from 'node:child_process';
import * as os from 'node:os';
import * as path from 'node:path';
import type { RepoContext, SystemInfo } from '../domain/context/SystemContext';
import type { LogService } from '../domain/logging/LogService';
import type { Filesystem } from '../domain/system/Filesystem';
import type { SystemAdapter } from '../domain/system/SystemAdapter';

export class NodeSystemAdapter implements SystemAdapter {
  constructor(
    private filesystem: Filesystem,
    private logService: LogService,
  ) {}

  // ─── System Information ─────────────────────────────────────────────

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
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: projectRoot })
          .toString()
          .trim();
        const dirty =
          execSync('git status --porcelain', { cwd: projectRoot }).toString().trim().length > 0;
        const hash = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim();

        git = { branch, dirty, lastCommitHash: hash };
      }
    } catch (e) {
      this.logService.error('Failed to gather git context', e, { component: 'NodeSystemAdapter' });
    }

    let dependencies: Record<string, string> = {};
    const pkgPath = path.join(projectRoot, 'package.json');
    if (this.filesystem.exists(pkgPath)) {
      try {
        const pkg = JSON.parse(this.filesystem.readFile(pkgPath));
        dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
      } catch (e) {
        this.logService.error('Failed to parse package.json', e, {
          component: 'NodeSystemAdapter',
        });
      }
    }

    return {
      git,
      dependencies,
      projectRoot,
    };
  }

  async detectCapability(
    name: string,
    checkCommand: string,
  ): Promise<{ available: boolean; version?: string }> {
    try {
      const output = execSync(checkCommand).toString().trim();
      return { available: true, version: output };
    } catch {
      return { available: false };
    }
  }

  // ─── Enhanced Binary/Stream Operations ────────────────────────────

  /**
   * Read first N bytes as Uint8Array.
   * For binary detection and magic byte checks.
   */
  async readFileBuffer(path: string, length = 1024): Promise<Uint8Array> {
    return this.filesystem.readFileBuffer(path, length);
  }

  /**
   * Read file as async stream for hashing.
   * Processes file in chunks to avoid memory issues.
   */
  async *readFileAsStream(path: string): AsyncGenerator<Buffer, void, undefined> {
    yield* this.filesystem.readFileAsStream(path);
  }

  // ─── Error Handling ───────────────────────────────────────────────

  private logError(err: Error | any): void {
    this.logService.error(
      'Filesystem operation failed',
      { message: err.message, path: err.path },
      { component: 'NodeSystemAdapter' },
    );
  }
}
