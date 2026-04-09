/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: System Diagnostics & Integrity Management.
 * Implementation: Automated health checks and infrastructure remediation.
 */

import * as path from 'node:path';
import { EventType } from '../../domain/Event';
import type { Filesystem } from '../../domain/system/Filesystem';
import { EventBus } from '../orchestration/EventBus';

export interface HealthStatus {
  healthy: boolean;
  issues: DiagnosticIssue[];
  timestamp: number;
}

export interface DiagnosticIssue {
  component: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  remediable: boolean;
  remediationAction?: string;
}

export class SovereignDoctor {
  private fs: Filesystem;
  private eventBus: EventBus;
  private workspaceRoot: string;

  constructor(fs: Filesystem, workspaceRoot: string) {
    this.fs = fs;
    this.eventBus = EventBus.getInstance();
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Performs a comprehensive diagnostic scan of the system.
   */
  async diagnose(): Promise<HealthStatus> {
    const issues: DiagnosticIssue[] = [];

    // 1. Check for stale lock files
    await this.checkLockIntegrity(issues);

    // 2. Check for infrastructure accessibility
    await this.checkInfrastructureHealth(issues);

    // 3. Check for workspace configuration
    await this.checkWorkspaceIntegrity(issues);

    const healthy =
      issues.filter((i) => i.severity === 'HIGH' || i.severity === 'CRITICAL').length === 0;

    const status = {
      healthy,
      issues,
      timestamp: Date.now(),
    };

    if (!healthy) {
      this.eventBus.publish(EventType.SYSTEM_ERROR, {
        component: 'SovereignDoctor',
        message: `System health check failed: ${issues.length} issues detected`,
      });
    }

    return status;
  }

  /**
   * Attempts to remediate detectable issues.
   */
  async remediate(
    issues: DiagnosticIssue[],
  ): Promise<{ successCount: number; failureCount: number }> {
    let successCount = 0;
    let failureCount = 0;

    for (const issue of issues) {
      if (issue.remediable && issue.remediationAction === 'CLEAR_LOCKS') {
        try {
          await this.clearStaleLocks();
          successCount++;
        } catch {
          failureCount++;
        }
      }
      // Add more remediation logic here
    }

    return { successCount, failureCount };
  }

  private async checkLockIntegrity(issues: DiagnosticIssue[]): Promise<void> {
    // Example: scan for .lock files that are older than 1 hour
    try {
      const entries = this.fs.readdir(this.workspaceRoot);
      for (const entry of entries) {
        if (entry.name.endsWith('.lock')) {
          const lockPath = path.join(this.workspaceRoot, entry.name);
          const stats = this.fs.stat(lockPath);
          const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);

          if (ageHours > 1) {
            issues.push({
              component: 'Infrastructure/Locks',
              severity: 'MEDIUM',
              message: `Stale lock file detected: ${entry.name} (Age: ${ageHours.toFixed(1)}h)`,
              remediable: true,
              remediationAction: 'CLEAR_LOCKS',
            });
          }
        }
      }
    } catch (error) {
      // Ignore directory read errors
    }
  }

  private async checkInfrastructureHealth(issues: DiagnosticIssue[]): Promise<void> {
    try {
      this.fs.exists(this.workspaceRoot);
    } catch (error) {
      issues.push({
        component: 'Infrastructure/Filesystem',
        severity: 'CRITICAL',
        message: `Filesystem adapter failure or workspace root inaccessible: ${this.workspaceRoot}`,
        remediable: false,
      });
    }
  }

  private async checkWorkspaceIntegrity(issues: DiagnosticIssue[]): Promise<void> {
    // Check for critical missing files
    const criticalFiles = ['package.json', 'tsconfig.json'];
    for (const file of criticalFiles) {
      if (!this.fs.exists(path.join(this.workspaceRoot, file))) {
        issues.push({
          component: 'Workspace/Integrity',
          severity: 'HIGH',
          message: `Critical workspace file missing: ${file}`,
          remediable: false,
        });
      }
    }
  }

  private async clearStaleLocks(): Promise<void> {
    const entries = this.fs.readdir(this.workspaceRoot);
    for (const entry of entries) {
      if (entry.name.endsWith('.lock')) {
        const lockPath = path.join(this.workspaceRoot, entry.name);
        const stats = this.fs.stat(lockPath);
        const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
        if (ageHours > 1) {
          await this.fs.unlink(lockPath);
        }
      }
    }
  }
}
