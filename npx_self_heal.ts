/**
 * [LAYER: INFRASTRUCTURE]
 * [SUB-ZONE: tools]
 * Principle: Structural Remediation — Professional command entry point for self-healing.
 */

import { HealingWorker } from './src/infrastructure/tools/HealingWorker';
import { SelfHealer } from './src/infrastructure/tools/SelfHealer';

async function main() {
    const isWorkerMode = process.argv.includes('--worker');

    if (isWorkerMode) {
        console.log('🏙️  JOY-ZONING: HIGH-THROUGHPUT HEALING WORKER');
        console.log('--------------------------------------------------');
        const worker = new HealingWorker();
        await worker.start();
        return;
    }

    const healer = new SelfHealer(process.cwd());
    const isDryRun = process.argv.includes('--dry-run');

    console.log('🏙️  JOY-ZONING: SELF-HEALING PROTOCOL (Pass 18)');
    console.log('--------------------------------------------------');

    const report = await healer.healProject({
        dryRun: isDryRun,
        onProgress: (step: { currentPath: string; targetPath: string }) => {
            console.log(`[MOVE] ${step.currentPath} -> ${step.targetPath}`);
        }
    });

    console.log('\n--------------------------------------------------');
    console.log(`✅ Healing Complete!`);
    console.log(`   - Moved: ${report.movedFiles}`);
    console.log(`   - Failed: ${report.failedFiles}`);
    
    if (report.errors.length > 0) {
        console.log('\n🚨 Errors Encountered:');
        report.errors.forEach(err => console.log(`   - ${err}`));
    }
}

main().catch(console.error);
