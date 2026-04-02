/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: High-Throughput Scanning — implements optimized project-wide integrity audits.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { IntegrityScanner } from '../domain/integrity/IntegrityScanner';
import { IntegrityPolicy } from '../domain/memory/IntegrityPolicy';
import { FileSystemAdapter } from './FileSystemAdapter';
import { ParallelProcessor } from './tools/ParallelProcessor';
import { 
  type IntegrityViolation, 
  type IntegrityReport, 
  ViolationType 
} from '../domain/memory/Integrity';

export class IntegrityAdapter implements IntegrityScanner {
  private filesystem: FileSystemAdapter;
  private policy: IntegrityPolicy;

  constructor(policy: IntegrityPolicy) {
    this.filesystem = new FileSystemAdapter();
    this.policy = policy;
  }

  /**
   * Scans the project for architectural integrity violations using high concurrency.
   */
  async scan(projectRoot: string): Promise<IntegrityReport> {
    const files = this.getAllFiles(path.join(projectRoot, 'src'));
    
    // Concurrent Scan of all files
    const results = await ParallelProcessor.map(files, async (file) => {
        const relPath = path.relative(projectRoot, file);
        return this.scanSingleFile(file, relPath);
    }, 25); // High parallelism for I/O bound header reads

    const violations = results.flat();
    const score = Math.max(0, 100 - (violations.length * 2));

    return {
      score,
      violations,
      scannedAt: new Date().toISOString(),
      fileCount: files.length
    };
  }

  /**
   * Scans a single file for violations.
   */
  async scanFile(filePath: string, projectRoot: string): Promise<IntegrityReport> {
    const fullPath = path.resolve(projectRoot, filePath);
    const relPath = path.relative(projectRoot, fullPath);
    
    const violations = await this.scanSingleFile(fullPath, relPath);
    const score = Math.max(0, 100 - (violations.length * 5));

    return {
        score,
        violations,
        scannedAt: new Date().toISOString()
    };
  }

  private async scanSingleFile(absPath: string, relPath: string): Promise<IntegrityViolation[]> {
    const violations: IntegrityViolation[] = [];
    
    if (!fs.existsSync(absPath)) return [];

    // Chunked Header Read (16KB)
    const content = this.readHeader(absPath);
    const rules = this.policy.getRulesForPath(relPath);

    // Rule Matching
    for (const rule of rules) {
      if (content.match(rule.pattern)) {
        violations.push(this.createViolation(
          rule.type,
          relPath,
          rule.message,
          rule.severity
        ));
      }
    }

    // Misplaced File Detection (Header Only)
    const layerMatch = content.slice(0, 500).match(/\[LAYER:?\s*([A-Z]+)\]/);
    if (layerMatch && layerMatch[1]) {
        const declaredLayer = layerMatch[1];
        const expectedDir = this.getExpectedDir(declaredLayer);
        if (expectedDir && !relPath.startsWith(expectedDir)) {
            violations.push(this.createViolation(
                ViolationType.MISPLACED_FILE,
                relPath,
                `File declares [LAYER: ${declaredLayer}] but is located in ${relPath}. Should be in ${expectedDir}.`,
                'error'
            ));
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
        'DOMAIN': 'src/domain',
        'CORE': 'src/core',
        'INFRASTRUCTURE': 'src/infrastructure',
        'UI': 'src/ui',
        'UTILS': 'src/utils'
    };
    return mapping[layer] || null;
  }

  private createViolation(type: ViolationType, file: string, message: string, severity: 'warn' | 'error'): IntegrityViolation {
    return {
      id: crypto.randomUUID(),
      type,
      file,
      message,
      severity,
      timestamp: new Date().toISOString()
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
