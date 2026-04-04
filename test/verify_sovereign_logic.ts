import { ArchitecturalGuardian } from '../src/domain/architecture/ArchitecturalGuardian';
import type { IntegrityPolicy } from '../src/domain/memory/IntegrityPolicy';
import { analyzeDependencies } from '../src/infrastructure/SemanticIntegrityAdapter';

async function testSovereign() {
  const policy = {} as IntegrityPolicy;

  console.log('--- Phase 1: Tag Drift Detection ---');
  const codeWithDrift = `
/**
 * [LAYER: INFRASTRUCTURE]
 * [SUB-ZONE: utils]
 */
export const data = 42;
`;
  const res1 = analyzeDependencies(
    'src/infrastructure/storage/FileSystem.ts',
    process.cwd(),
    policy,
    codeWithDrift,
  );

  const driftViolation = res1.violations.find((v) => v.type === 'tag_drift');
  if (driftViolation) {
    console.log('✅ Success: Detected Tag Drift!', driftViolation.message);
  } else {
    console.log('❌ Failure: Failed to detect Tag Drift.');
  }

  console.log('\n--- Phase 2: Cluster Topology Blocking ---');
  const currentReport = { score: 100, violations: [] };

  // storage -> prompts is NOT allowed in our TOPO_RULES
  const res2 = await ArchitecturalGuardian.simulateGuard(
    'src/infrastructure/storage/FileSystem.ts',
    'src/infrastructure/prompts/MyPrompt.ts',
    currentReport,
  );

  const topoViolation = res2.violations.find((v) => v.type === 'CLUSTER_ENTANGLEMENT');
  if (topoViolation) {
    console.log('✅ Success: Blocked Cluster Entanglement!', topoViolation.message);
  } else {
    console.log('❌ Failure: Failed to block Cluster Entanglement.');
  }

  console.log('\n--- Phase 3: Valid Sovereign Move ---');
  // prompts -> storage IS allowed (prompts depends on storage)
  // Wait, I check if source can import target.
  // In simulateGuard(current, target), it checks if current can import target.
  const res3 = await ArchitecturalGuardian.simulateGuard(
    'src/infrastructure/prompts/MyPrompt.ts',
    'src/infrastructure/storage/FileSystem.ts',
    currentReport,
  );

  if (res3.violations.length === 0) {
    console.log('✅ Success: Allowed Valid Cluster Dependency (prompts -> storage).');
  } else {
    console.log('❌ Failure: Blocked valid cluster dependency.', res3.violations);
  }
}

testSovereign().catch(console.error);
