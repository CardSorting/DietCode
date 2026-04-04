import { ArchitecturalGuardian } from '../src/domain/architecture/ArchitecturalGuardian';

async function test() {
  const currentReport = { score: 100, violations: [] };

  // Test 1: FileSystemAdapter should suggest storage/filesystem
  const res1 = await ArchitecturalGuardian.simulateGuard(
    'src/infrastructure/FileSystemAdapter.ts',
    'src/infrastructure/FileSystemAdapter.ts', // same path but in root triggers check
    currentReport,
  );
  console.log('Test 1 (FileSystem):', res1.violations[0]?.message);
  if (res1.violations[0]?.message.includes('src/infrastructure/storage/filesystem/')) {
    console.log('✅ Test 1 Passed: Correct suggestion for FileSystem.');
  } else {
    console.log('❌ Test 1 Failed: Incorrect or missing suggestion.');
  }

  // Test 2: IntegrityAdapter should suggest integrity/
  const res2 = await ArchitecturalGuardian.simulateGuard(
    'src/infrastructure/IntegrityAdapter.ts',
    'src/infrastructure/IntegrityAdapter.ts',
    currentReport,
  );
  console.log('Test 2 (Integrity):', res2.violations[0]?.message);
  if (res2.violations[0]?.message.includes('src/infrastructure/integrity/')) {
    console.log('✅ Test 2 Passed: Correct suggestion for Integrity.');
  } else {
    console.log('❌ Test 2 Failed: Incorrect or missing suggestion.');
  }

  // Test 3: LLMProvider should suggest llm/ (no keyword match, should default or show no suggestion)
  // Wait, I didn't add LLM keyword but I added error/event/validation for Domain.
  // Test 4: Domain Error
  const res4 = await ArchitecturalGuardian.simulateGuard(
    'src/domain/Errors.ts',
    'src/domain/Errors.ts',
    currentReport,
  );
  console.log('Test 4 (Domain Error):', res4.violations[0]?.message);
  if (res4.violations[0]?.message.includes('src/domain/common/errors/')) {
    console.log('✅ Test 4 Passed: Correct suggestion for Domain Error.');
  } else {
    console.log('❌ Test 4 Failed: Incorrect or missing suggestion.');
  }
}

test().catch(console.error);
