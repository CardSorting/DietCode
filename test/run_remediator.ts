import { Remediator } from '../src/infrastructure/tools/Remediator';
import * as path from 'path';

async function runRemediator() {
    const remediator = new Remediator(process.cwd());
    console.log('--- Generating JoyZoning Remediation Plan ---');
    const steps = await remediator.generatePlan();
    
    console.log(`\nFound ${steps.length} orphaned files to remediate.\n`);
    
    steps.forEach((step, idx) => {
        console.log(`[${idx + 1}] File: ${step.file}`);
        console.log(`    Target: ${step.targetPath}`);
        console.log(`    Move: ${step.currentPath} -> ${step.targetPath}`);
        console.log(`    Layer: ${step.targetLayer} / ${step.targetSubZone}`);
        console.log('---');
    });
}

runRemediator().catch(console.error);
