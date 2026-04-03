/**
 * [LAYER: UTILS]
 * JoyZoning Enforcement Script
 * 
 * Usage: bun run verify_joyzoning.ts [path/to/file.ts]
 * If no path is provided, scans the entire project.
 */

import { IntegrityAdapter } from './src/infrastructure/IntegrityAdapter';
import { IntegrityService } from './src/core/integrity/IntegrityService';
import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';
import { ConsoleLoggerAdapter } from './src/infrastructure/ConsoleLoggerAdapter';
import { IntegrityPolicy } from './src/domain/memory/IntegrityPolicy';
import { LogLevel } from './src/domain/logging/LogLevel';
import * as path from 'path';

async function main() {
    const logger = new ConsoleLoggerAdapter();
    logger.setMinLevel(LogLevel.INFO);
    const fs = new FileSystemAdapter();
    const policy = new IntegrityPolicy();
    const integrityAdapter = new IntegrityAdapter(policy, logger);
    const integrityService = new IntegrityService(integrityAdapter, undefined, logger);

    const projectRoot = process.cwd();
    const targetFile = process.argv[2];

    if (targetFile) {
        console.log(`\n🔍 Verifying JoyZoning for: ${targetFile}`);
        const report = await integrityService.scan(projectRoot);
        const fileViolations = report.violations.filter(v => v.file === targetFile || path.join(projectRoot, v.file) === path.resolve(targetFile));

        if (fileViolations.length === 0) {
            console.log('✅ JoyZoning Verified: No architectural violations found.');
        } else {
            console.log(`❌ Found ${fileViolations.length} architectural violations:`);
            fileViolations.forEach(v => {
                console.log(`  - [${v.type}] ${v.message} (${v.severity})`);
            });
            process.exit(1);
        }
    } else {
        console.log('\n🔍 Scanning entire project for JoyZoning violations...');
        const report = await integrityService.scan(projectRoot);
        
        if (report.violations.length === 0) {
            console.log(`✅ Project Health: ${report.score}/100. No violations found.`);
        } else {
            console.log(`⚠️  Project Health: ${report.score}/100. Found ${report.violations.length} violations.`);
            report.violations.forEach(v => {
                console.log(`  - [${v.file}] [${v.type}] ${v.message}`);
            });
            process.exit(1);
        }
    }
}

main().catch(console.error);
