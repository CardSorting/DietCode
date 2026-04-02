/**
 * [LAYER: CORE]
 * Principle: Batched Enforcement — debounces scans for JoyZoning violations.
 * Optimization: Pass 4 Throughput — zero stalling via background queue.
 */

import type { Hook } from '../../domain/hooks/HookContract';
import { HookPhase } from '../../domain/hooks/HookContract';
import { IntegrityService } from './IntegrityService';
import { WorkerIntegrityAdapter } from '../../infrastructure/WorkerIntegrityAdapter';
import { RefactorTools } from '../../infrastructure/tools/RefactorTools';
import { JoyMapGenerator } from '../../infrastructure/tools/generate_joy_map';

export class JoyZoningHook implements Hook {
  public readonly name = 'JoyZoningGuard';
  public readonly phase = HookPhase.POST_EXECUTION;
  public readonly priority = 100; // High priority
  public readonly isBackground = true; 

  private static isAuditing = false;
  private auditQueue: Set<string> = new Set();
  private auditTimeout: NodeJS.Timeout | null = null;
  private refactorTools: RefactorTools;
  private joyMap: JoyMapGenerator;

  constructor(
    private integrityService: IntegrityService,
    private workerAdapter: WorkerIntegrityAdapter,
    private projectRoot: string
  ) {
    this.refactorTools = new RefactorTools();
    this.joyMap = new JoyMapGenerator();
  }

  /**
   * Schedules an architectural audit for the modified file.
   * Returns immediately (non-blocking).
   */
  async execute(params: { toolName: string; input: any; result?: any }): Promise<void> {
    const { input, toolName } = params;
    const filePath = input.path || input.targetPath || input.filePath;

    if (filePath && typeof filePath === 'string') {
      // 1. Instantly update JoyCache (O(1) database write)
      this.refactorTools.updateCache(filePath, this.projectRoot).catch(() => {});

      // 2. Queue for batched architectural audit
      this.queueAudit(filePath);
    }
  }

  private queueAudit(filePath: string): void {
    this.auditQueue.add(filePath);

    if (this.auditTimeout) {
        clearTimeout(this.auditTimeout);
    }

    // Debounce: Wait for 250ms of quiet before auditing
    this.auditTimeout = setTimeout(async () => {
        if (JoyZoningHook.isAuditing) {
          // Already auditing, re-schedule for next tick
          this.queueAudit(filePath);
          return;
        }

        const batch = Array.from(this.auditQueue);
        this.auditQueue.clear();
        this.auditTimeout = null;

        if (batch.length > 0) {
            JoyZoningHook.isAuditing = true;
            console.log(`🛡️  [Batched Audit] Offloading ${batch.length} files to worker thread...`);
            try {
              for (const path of batch) {
                  // Pass 7: Background worker scan
                  const report = await this.workerAdapter.scanFile(path, this.projectRoot);
                  // We still report violations via the main service to preserve events
                  await this.integrityService.reportViolationsThroughput(report);
              }
              
              // Pass 11: Live Dashboard Generation
              await this.joyMap.generate(this.projectRoot);
            } finally {
              JoyZoningHook.isAuditing = false;
            }
        }
    }, 250);
  }
}
