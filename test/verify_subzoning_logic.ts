import { ArchitecturalGuardian } from '../src/domain/architecture/ArchitecturalGuardian';

async function test() {
  const currentReport = { score: 100, violations: [] };
  
  // Test 1: Move to layer root (should warn)
  const result1 = await ArchitecturalGuardian.simulateGuard(
    'src/infrastructure/tools/RefactorTools.ts',
    'src/infrastructure/MyNewTool.ts',
    currentReport
  );
  console.log('Test 1 (Root Move):', JSON.stringify(result1, null, 2));
  if (result1.violations.some(v => v.type === 'SUBZONE_MISSING')) {
    console.log('✅ Test 1 Passed: SUBZONE_MISSING detected.');
  } else {
    console.log('❌ Test 1 Failed: SUBZONE_MISSING not detected.');
  }

  // Test 2: Move to sub-zone (should be safe)
  const result2 = await ArchitecturalGuardian.simulateGuard(
    'src/infrastructure/tools/RefactorTools.ts',
    'src/infrastructure/tools/MyNewTool.ts',
    currentReport
  );
  console.log('Test 2 (Sub-Zone Move):', JSON.stringify(result2, null, 2));
  if (result2.violations.length === 0) {
    console.log('✅ Test 2 Passed: No violations for sub-zone move.');
  } else {
    console.log('❌ Test 2 Failed: Unexpected violations.');
  }

  // Test 3: index.ts exception
  const result3 = await ArchitecturalGuardian.simulateGuard(
    'src/infrastructure/tools/index.ts',
    'src/infrastructure/index.ts',
    currentReport
  );
  if (result3.violations.length === 0) {
    console.log('✅ Test 3 Passed: index.ts allowed in root.');
  } else {
    console.log('❌ Test 3 Failed: index.ts should be allowed in root.');
  }
}

test().catch(console.error);
