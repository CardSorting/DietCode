import * as fs from 'fs';
import * as path from 'path';
import { RefactorTools } from '../src/infrastructure/tools/RefactorTools';
import { SemanticIntegrityAdapter } from '../src/infrastructure/SemanticIntegrityAdapter';
import { IntegrityPolicy } from '../src/domain/memory/IntegrityPolicy';

async function testSelfHealing() {
    const projectRoot = process.cwd();
    const scanner = new SemanticIntegrityAdapter({} as IntegrityPolicy);
    const refactorTools = new RefactorTools(scanner);

    console.log('--- Phase 1: Setup Test Scenario ---');
    const orphanPath = path.join(projectRoot, 'src/infrastructure/TempOrphan.ts');
    const importerPath = path.join(projectRoot, 'src/core/TempImporter.ts');
    const targetPath = 'src/infrastructure/storage/filesystem/TempOrphan.ts';

    const orphanContent = `
/**
 * [LAYER: INFRASTRUCTURE]
 */
export const temp = 'I am an orphan';
`;
    const importerContent = `
/**
 * [LAYER: CORE]
 */
import { temp } from '../infrastructure/TempOrphan';
console.log(temp);
`;

    fs.writeFileSync(orphanPath, orphanContent);
    fs.writeFileSync(importerPath, importerContent);
    console.log('✅ Created orphan and importer.');

    console.log('\n--- Phase 2: Execute moveAndFixImports ---');
    const result = await refactorTools.moveAndFixImports(
        'src/infrastructure/TempOrphan.ts',
        targetPath,
        { force: true }
    );

    if (result.success) {
        console.log('✅ Success: File moved successfully.');
    } else {
        console.log('❌ Failure: Move blocked or failed.', result.reason);
        return;
    }

    console.log('\n--- Phase 3: Verify Results ---');
    
    // 1. Check if file exists at new location
    if (fs.existsSync(path.join(projectRoot, targetPath))) {
        console.log('✅ Success: File exists at target path.');
    } else {
        console.log('❌ Failure: File missing at target path.');
    }

    // 2. Check if header was updated
    const updatedOrphan = fs.readFileSync(path.join(projectRoot, targetPath), 'utf8');
    if (updatedOrphan.includes('[SUB-ZONE: storage]')) {
        console.log('✅ Success: Header updated with [SUB-ZONE: storage].');
    } else {
        console.log('❌ Failure: Header not updated.');
    }

    // 3. Check if importer was fixed
    const updatedImporter = fs.readFileSync(importerPath, 'utf8');
    if (updatedImporter.includes("../infrastructure/storage/filesystem/TempOrphan")) {
        console.log('✅ Success: Importer path fixed!');
        console.log('   New Import:', updatedImporter.split('\n')[4]);
    } else {
        console.log('❌ Failure: Importer path NOT fixed.');
        console.log('   Current Importer Content:', updatedImporter);
    }

    // --- Cleanup ---
    console.log('\n--- Cleanup ---');
    if (fs.existsSync(path.join(projectRoot, targetPath))) fs.unlinkSync(path.join(projectRoot, targetPath));
    if (fs.existsSync(importerPath)) fs.unlinkSync(importerPath);
    console.log('✅ Test files removed.');
}

testSelfHealing().catch(console.error);
