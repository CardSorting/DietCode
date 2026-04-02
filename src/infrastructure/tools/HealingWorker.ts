/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Healing Worker — High-throughput background remediation of organizational debt.
 * Pass 18: Broccoli Flow Protocol.
 */

import { SovereignDb } from '../database/SovereignDb';
import { ImportFixer } from './ImportFixer';
import { RefactorTagSentinel } from './refactor/RefactorTagSentinel';
import * as path from 'path';

export class HealingWorker {
  private importFixer: ImportFixer;
  private tagSentinel: RefactorTagSentinel;
  private projectRoot: string;
  private isProcessing = false;

  constructor() {
    this.projectRoot = path.resolve(process.cwd(), '.');
    this.importFixer = new ImportFixer(this.projectRoot);
    this.tagSentinel = new RefactorTagSentinel(this.projectRoot);
  }

  /**
   * Start the high-throughput healing loop via broccoliq.process.
   */
  async start(): Promise<void> {
    if (this.isProcessing) return;
    const queue = await SovereignDb.getQueue();

    console.log('🌱 JoyZoning Healing Worker: INITIALIZED');
    
    this.isProcessing = true;

    // Process jobs with concurrency of 3 for refactoring safety
    queue.process(async (job) => {
      // BroccoliQ payload normalization
      const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
      
      console.log(`🩹 Healing Job Received: [${job.id}] Type: ${payload.type}`);

      if (payload.type === 'SELF_HEAL') {
        const { oldPath, newPath } = payload.payload;
        
        console.log(`🛠️  Executing Healing: ${oldPath} → ${newPath}`);
        
        // 1. Resolve Imports (Project-wide)
        const result = await this.importFixer.fixImports(oldPath, newPath);
        console.log(`✅ Imports Resolved: ${result.updatedFiles.length} files aligned.`);
        
        // 2. Ensure Tag Consistency
        await this.tagSentinel.updateTags(newPath);
        console.log(`✅ Sovereign Tags Aligned.`);
      }
    }, { concurrency: 3 });
  }

  stop(): void {
    this.isProcessing = false;
    console.log('🛑 JoyZoning Healing Worker: STOPPED');
  }
}
