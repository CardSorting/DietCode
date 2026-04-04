/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: High-Throughput Scanning via Worker Pool Sharding
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IntegrityScanner } from '../domain/integrity/IntegrityScanner';
import type { LogService } from '../domain/logging/LogService';
import {
  type IntegrityReport,
  type IntegrityViolation,
  ViolationType,
} from '../domain/memory/Integrity';
import type { IntegrityPolicy } from '../domain/memory/IntegrityPolicy';
import { FileSystemAdapter } from './FileSystemAdapter';
import { WorkerPoolAdapter } from './WorkerPoolAdapter';

export class IntegrityAdapter implements IntegrityScanner {
  private poolAdapter!: WorkerPoolAdapter;
  private policy: IntegrityPolicy;
  private filesystem: FileSystemAdapter;
  private isWorker: boolean;
  private useQueue: boolean;

  constructor(
    policy: IntegrityPolicy,
    private logService: LogService,
    isWorker = false,
    useQueue = true,
  ) {
    this.isWorker = isWorker;
    this.useQueue = useQueue;
    this.filesystem = new FileSystemAdapter();
    this.policy = policy;
    if (!this.isWorker) {
      this.poolAdapter = new WorkerPoolAdapter(this, logService, useQueue);
    }
  }

  /**
   * MAIN METHOD: Scans project using WorkerPoolAdapter for multi-core sharding.
   */
  async scan(projectRoot: string): Promise<IntegrityReport> {
    if (this.isWorker) {
      // Workers should use sequential scanFiles to avoid recursive pool spawning
      const files = this.getAllFiles(path.join(projectRoot, 'src'));
      return this.scanFiles(
        files.map((f) => path.relative(projectRoot, f)),
        projectRoot,
      );
    }
    return this.poolAdapter.scan(projectRoot);
  }

  /**
   * Scans a single file for violations.
   */
  async scanFile(filePath: string, projectRoot: string): Promise<IntegrityReport> {
    const fullPath = path.resolve(projectRoot, filePath);
    const relPath = path.relative(projectRoot, fullPath);

    const violations = await this.scanSingleFile(fullPath, relPath);

    return {
      violations,
      scannedAt: new Date().toISOString(),
      score: Math.max(0, 100 - violations.length * 10),
    };
  }

  /**
   * Scans a set of files sequentially (no worker pool).
   */
  async scanFiles(files: string[], projectRoot: string): Promise<IntegrityReport> {
    const allViolations: IntegrityViolation[] = [];
    for (const file of files) {
      const fullPath = path.resolve(projectRoot, file);
      const relPath = path.relative(projectRoot, fullPath);
      const violations = await this.scanSingleFile(fullPath, relPath);
      allViolations.push(...violations);
    }
    return {
      violations: allViolations,
      scannedAt: new Date().toISOString(),
      fileCount: files.length,
      score: Math.max(0, 100 - allViolations.length * 10),
    };
  }

  public async scanSingleFile(absPath: string, relPath: string): Promise<IntegrityViolation[]> {
    const violations: IntegrityViolation[] = [];

    if (!fs.existsSync(absPath)) return [];

    // Chunked Header Read (16KB)
    const content = this.readHeader(absPath);
    const rules = this.policy.getRulesForPath(relPath);

    // Rule Matching
    for (const rule of rules) {
      if (content.match(rule.pattern)) {
        violations.push(this.createViolation(rule.type, relPath, rule.message, rule.severity));
      }
    }

    // Misplaced File Detection (Header Only)
    const layerMatch = content.slice(0, 500).match(/\[LAYER:?\s*([A-Z]+)\]/);
    if (layerMatch?.[1]) {
      const declaredLayer = layerMatch[1];
      const expectedDir = this.getExpectedDir(declaredLayer);
      if (expectedDir && !relPath.startsWith(expectedDir)) {
        violations.push(
          this.createViolation(
            ViolationType.MISPLACED_FILE,
            relPath,
            `File declares [LAYER: ${declaredLayer}] but is located in ${relPath}. Should be in ${expectedDir}.`,
            'error',
          ),
        );
      }
    }

    return violations;
  }

  private readHeader(filePath: string): string {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(16384);
    try {
      fs.readSync(fd, buffer, 0, 16384, 0);
      return buffer.toString('utf8');
    } finally {
      fs.closeSync(fd);
    }
  }

  private getExpectedDir(layer: string): string | null {
    const mapping: Record<string, string> = {
      DOMAIN: 'src/domain',
      CORE: 'src/core',
      INFRASTRUCTURE: 'src/infrastructure',
      UI: 'src/ui',
      PLUMBING: 'src/plumbing',
      UTILS: 'src/utils',
    };
    return mapping[layer] || null;
  }

  private createViolation(
    type: ViolationType,
    file: string,
    message: string,
    severity: 'warn' | 'error',
  ): IntegrityViolation {
    return {
      id: crypto.randomUUID(),
      type,
      file,
      message,
      severity,
      timestamp: new Date().toISOString(),
    };
  }

  private getAllFiles(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const name = path.join(dir, file);
      if (fs.statSync(name).isDirectory()) {
        if (!name.includes('node_modules') && !name.includes('.git')) {
          this.getAllFiles(name, fileList);
        }
      } else if (name.endsWith('.ts')) {
        fileList.push(name);
      }
    }
    return fileList;
  }
}
