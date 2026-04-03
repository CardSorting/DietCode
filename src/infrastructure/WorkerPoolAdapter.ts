import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'node:crypto';
import { Worker } from 'worker_threads';
import { Core } from './database/sovereign/Core';
import { JobType } from '../domain/system/QueueProvider';
import { IntegrityScanner } from '../domain/integrity/IntegrityScanner';
import { SovereignWorkerProxy } from './queue/SovereignWorkerProxy';
import { type IntegrityReport, type IntegrityViolation } from '../domain/memory/Integrity';
import type { LogService } from '../domain/logging/LogService';

export interface ShardResult {
  shardId: number;
  success: boolean;
  score: number;
  violations: IntegrityViolation[];
  time: number;
  error?: string;
}

export interface ScanPartitionRequest {
  type: 'SCAN_PARTITION';
  shardId: number;
  files: string[];
  scannerType: string;
  projectRoot: string;
}

export interface PoolMetrics {
  workerCount: number;
  completedWorkers: number;
  failedWorkers: number;
  totalCPUTime: number;
}

/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Parallelized Integrity Checks via Worker Pool or Sovereign Queue.
 * 
 * Strategy 1: Local Worker Pool (Fastest, High CPU Peak)
 * Strategy 2: Sovereign Queue (Throttled, Distributed)
 */
export class WorkerPoolAdapter {
  private workers: Worker[] = [];
  private completedResults: ShardResult[] = [];
  private projectRoot: string;
  private metrics!: PoolMetrics;
  private useQueue: boolean;
  private proxy: SovereignWorkerProxy;

  constructor(
    private scanner: IntegrityScanner,
    private logService: LogService,
    useQueue = true
  ) {
    this.useQueue = useQueue;
    const cpuCores = os.cpus().length;
    this.projectRoot = path.resolve(process.cwd(), '.');
    
    const broccoliQueue: any = {
        enqueue: async (job: any) => {
            const qa = await Core.getQueue();
            return qa.enqueue(job);
        }
    };
    this.proxy = new SovereignWorkerProxy(broccoliQueue, logService);

    if (!this.useQueue) {
        // Spawn workers
        const workerPath = path.resolve(__dirname, './workers/ShardedIntegrityWorker.ts');
        this.workers = Array.from({ length: cpuCores }, (_, i) => 
          new Worker(workerPath, {
            workerData: { shardId: i },
            execArgv: ['-r', 'tsx']
          })
        );
    
        // Listen for messages
        this.workers.forEach((worker, i) => {
          worker.on('message', (result: ShardResult) => {
            this.handleWorkerResult(i, result);
          });
    
          worker.on('error', (err: Error) => {
            this.logService.error(`Worker ${i} crashed: ${err.message}`, err, { component: 'WorkerPoolAdapter', nodeId: `worker-${i}` });
            this.metrics.failedWorkers++;
          });
        });
    } else {
        this.logService.info('WorkerPoolAdapter initialized in Sovereign Queue mode (Throttled CPU)', {}, { component: 'WorkerPoolAdapter' });
    }

    this.metrics = {
      workerCount: cpuCores,
      completedWorkers: 0,
      failedWorkers: 0,
      totalCPUTime: 0
    };
  }

  async scan(projectRoot: string): Promise<IntegrityReport> {
    const startTime = Date.now();
    this.metrics.completedWorkers = 0;
    this.metrics.failedWorkers = 0;
    this.completedResults = [];

    // Step 1: Collect files
    const projectFiles = this.getAllTsFiles(path.join(projectRoot, 'src'));
    const fileCount = projectFiles.length;
    
    // Step 2: Sharding
    // We use cpu count or queue concurrency for shard count
    const shardCount = this.useQueue ? 8 : this.workers.length;
    this.logService.info(`Sharding ${fileCount} files across ${shardCount} workers (${Math.round(fileCount/shardCount)}/worker)`, { fileCount, shardCount }, { component: 'WorkerPoolAdapter' });

    const partitions: string[][] = Array.from({ length: shardCount }, () => []);
    projectFiles.forEach((file, index) => {
      const partition = partitions[index % shardCount];
      if (partition) {
        partition.push(path.relative(projectRoot, file));
      }
    });

    if (this.useQueue) {
        return this.scanViaQueue(partitions, projectRoot, startTime, fileCount);
    }

    // Step 3: Execute scan partitions (Local Workers)
    const promises = partitions.map((files, shardId) => {
      return new Promise<ShardResult>((resolve) => {
        // Send message to worker (WorkerPoolAdapter.ts:145)
        const worker = this.workers[shardId];
        if (worker) {
            worker.postMessage({
                type: 'SCAN_PARTITION',
                shardId,
                files,
                scannerType: 'IntegrityScanner',
                projectRoot
            } as ScanPartitionRequest);
            
            // Listen for specific shard completion
            const listener = (result: ShardResult) => {
                if (result.shardId === shardId) {
                    worker.removeListener('message', listener);
                    resolve(result);
                }
            };
            worker.on('message', listener);
        }
      });
    });

    const shardResults = await Promise.all(promises);
    this.postProcessResults(shardResults, startTime);

    const maxScore = Math.max(0, 100 - shardResults.reduce((acc, r) => acc + r.violations.length * 5, 0));
    const combinedViolations = shardResults.flatMap(r => r.violations);

    return {
      score: maxScore,
      violations: combinedViolations,
      scannedAt: new Date().toISOString(),
      fileCount
    };
  }

  private getAllTsFiles(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;
    
    const walkDir = (currentPath: string) => {
      const files = fs.readdirSync(currentPath);
      for (const file of files) {
        const filePath = path.join(currentPath, file);
        if (fs.statSync(filePath).isDirectory()) {
          if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('.antigravity')) {
            walkDir(filePath);
          }
        } else if (file.endsWith('.ts')) {
          fileList.push(filePath);
        }
      }
    };

    walkDir(dir);
    return fileList;
  }

  /**
   * Handle worker result and track metrics
   */
  private handleWorkerResult(index: number, result: ShardResult): void {
    this.completedResults[index] = result;
    this.metrics.completedWorkers++;
  }

  /**
   * Compute final metrics from completed results
   */
  private postProcessResults(results: ShardResult[], startTime: number): void {
    const failedCount = results.filter(r => !r.success).length;
    const totalTime = Date.now() - startTime;

    results.forEach(r => {
      if (r.error) {
        this.logService.warn(`Shard ${r.shardId} failed: ${r.error}`, { shardId: r.shardId, error: r.error }, { component: 'WorkerPoolAdapter' });
        this.metrics.failedWorkers++;
      }
    });

    this.metrics.totalCPUTime = totalTime;
    this.logService.info(`Scanned ${results.length} workers in ${totalTime}ms (${Math.round(totalTime / results.length)}ms/worker)`, { workerCount: results.length, totalTime }, { component: 'WorkerPoolAdapter' });
    if (failedCount > 0) {
      this.logService.warn(`${failedCount} workers failed`, { failedCount }, { component: 'WorkerPoolAdapter' });
    }
  }

  getMetrics(): PoolMetrics {
    return this.metrics;
  }

  /**
   * scanViaQueue: Strategy 2 - Distributed sharding via BroccoliQ
   */
  private async scanViaQueue(partitions: string[][], projectRoot: string, startTime: number, fileCount: number): Promise<IntegrityReport> {
    const shards = partitions.map(p => ({
        files: p,
        projectRoot
    }));

    const results = await this.proxy.executeDistributed<any, IntegrityReport>(
        JobType.INTEGRITY_SHARD,
        shards,
        { timeoutMs: 120000 }
    );

    const shardResults: ShardResult[] = results.map(r => ({
        shardId: r.shardId,
        success: r.success,
        score: r.payload?.score || 0,
        violations: r.payload?.violations || [],
        time: 0,
        error: r.error
    }));

    this.postProcessResults(shardResults, startTime);

    const maxScore = Math.max(0, 100 - shardResults.reduce((acc, r) => acc + r.violations.length * 5, 0));
    const combinedViolations = shardResults.flatMap(r => r.violations);

    return {
      score: maxScore,
      violations: combinedViolations,
      scannedAt: new Date().toISOString(),
      fileCount
    };
  }
}