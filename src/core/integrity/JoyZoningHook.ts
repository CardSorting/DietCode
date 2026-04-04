/**
 * [LAYER: CORE]
 * Principle: Integrity Hook — captures file save events and triggers architectural audits.
 * Pass 13: Autonomous Self-Healing Integration.
 */

import { HealingStatus } from '../../domain/healing/Healing';
import type { HealingRepository } from '../../domain/healing/HealingRepository';
import { type Hook, HookPhase } from '../../domain/hooks/HookContract';
import type { WorkerIntegrityAdapter } from '../../infrastructure/WorkerIntegrityAdapter';
import { RefactorTools } from '../../infrastructure/tools/RefactorTools';
import { JoyMapGenerator } from '../../infrastructure/tools/generate_joy_map';
import type { HealingService } from './HealingService';
import type { IntegrityService } from './IntegrityService';

export class JoyZoningHook implements Hook {
  public readonly name = 'JoyZoningGuard';
  public readonly phase = HookPhase.POST_EXECUTION;
  public readonly priority = 10;
  private static isAuditing = false;
  private auditQueue: Set<string> = new Set();
  private auditTimeout: any = null;
  private refactorTools: RefactorTools;
  private joyMap: JoyMapGenerator;

  constructor(
    private integrityService: IntegrityService,
    private workerAdapter: WorkerIntegrityAdapter,
    private healingService: HealingService,
    private healingRepository: HealingRepository,
    private projectRoot: string,
  ) {
    this.refactorTools = new RefactorTools(this.integrityService);
    this.joyMap = new JoyMapGenerator();
  }

  async execute(params: { toolName: string; input: any; result?: any }): Promise<void> {
    const filePath = params.input?.path || params.input?.filePath || (params.result as any)?.path;
    if (!filePath || !filePath.endsWith('.ts')) return;
    this.auditQueue.add(filePath);
    if (this.auditTimeout) {
      clearTimeout(this.auditTimeout);
    }
    this.auditTimeout = setTimeout(async () => {
      await this.runAuditBatch();
    }, 2000);
  }

  private async runAuditBatch(): Promise<void> {
    if (JoyZoningHook.isAuditing || this.auditQueue.size === 0) return;
    JoyZoningHook.isAuditing = true;
    const batch = Array.from(this.auditQueue);
    this.auditQueue.clear();
    try {
      for (const filePath of batch) {
        const report = await this.integrityService.scanFile(filePath, this.projectRoot);
        if (report.violations.length > 0) {
          const violationId = report.violations[0]?.id;
          if (violationId) {
            const proposals = await this.healingRepository.getProposalsForViolation(violationId);
            for (const proposal of proposals) {
              if (proposal.confidence === 1.0 && proposal.status === HealingStatus.PENDING) {
                await this.healingService.applyProposal(proposal.id);
              }
            }
          }
        }
        await this.integrityService.reportViolationsThroughput(report);
      }
      await this.joyMap.generate(this.projectRoot);
    } catch (err) {
      console.error('❌ [JoyZoning] Audit batch failed:', err);
    } finally {
      JoyZoningHook.isAuditing = false;
    }
  }
}
