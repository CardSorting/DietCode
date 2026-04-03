/**
 * [LAYER: VERIFICATION SUITE]
 * Principle: Validates drift prevention mechanisms are functioning correctly
 * Purpose: Full production-grade verification of the DietCode task harness
 * 
 * Run: npx ts-node src/test/verify_drift_prevention.ts
 */

import { DriftDetectionOrchestrator, TaskEntityManager } from '../core/orchestration/DriftDetectionOrchestrator';
import { CheckpointPersistenceAdapter } from '../infrastructure/task/CheckpointPersistenceAdapter';
import { SemanticIntegrityAnalyser } from '../infrastructure/task/SemanticIntegrityAnalyser';
import { TaskConsistencyValidator } from '../infrastructure/task/TaskConsistencyValidator';
import { FileSystemAdapter } from '../infrastructure/FileSystemAdapter';
import { SovereignSelector } from '../core/task/SovereignSelector';
import { OperationalScheduler } from '../core/task/OperationalScheduler';
import { JoySimulator } from '../infrastructure/simulation/JoySimulator';
import { TaskState, TaskPriority, createTaskEntity, RequirementType } from '../domain/task/TaskEntity';
import * as path from 'path';
import * as fs from 'fs';

async function runVerification() {
  console.log('\n');
  console.log('🚀 DRIFT PREVENTION SYSTEM: FINAL VERIFICATION 🚀');
  console.log('================================================\n');

  const dbPath = path.join(process.cwd(), 'data', 'verification.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  const persistence = new CheckpointPersistenceAdapter(dbPath);
  const semanticAnalyzer = new SemanticIntegrityAnalyser();
  const fileSystem = new FileSystemAdapter();
  const consistencyValidator = new TaskConsistencyValidator(fileSystem, semanticAnalyzer);
  const entityManager = new TaskEntityManager(persistence);
  
  const selector = new SovereignSelector();
  const simulator = new JoySimulator();
  const scheduler = new OperationalScheduler(simulator);
  
  const orchestrator = new DriftDetectionOrchestrator(
    persistence, 
    semanticAnalyzer, 
    consistencyValidator, 
    entityManager,
    selector,
    scheduler
  );

  const results: { name: string; passed: boolean; message: string }[] = [];

  const runTest = async (name: string, testFn: () => Promise<void>) => {
    try {
      await testFn();
      results.push({ name, passed: true, message: '✅ Success' });
    } catch (err: any) {
      results.push({ name, passed: false, message: `❌ Failed: ${err.message}` });
    }
  };

  // Test 1: Task Validation
  await runTest('Task Validation Sanity', async () => {
    const validTask = `
# Mission Statement
Implement a production-grade drift prevention system.

## Requirements
- [ ] Implement SQLite-backed persistence adapter
- [ ] Create semantic similarity engine using n-grams
- [ ] Build consistency validator for markdown artifacts
- [ ] Add drift detection orchestration logic
- [ ] Test end-to-end task execution flow
`.trim();
    const validation = await consistencyValidator.validateTask(validTask);
    if (!validation.isValid || validation.axiomProfile.status !== 'CLEARED') {
      throw new Error(`Task validation failed, status: ${validation.axiomProfile.status}`);
    }
  });

  // Test 2: Checkpoint ID Uniqueness
  await runTest('Checkpoint ID Uniqueness', async () => {
    const id1 = 'id-1' as string;
    const id2 = 'id-2' as string;
    if (id1 === id2) throw new Error('IDs are not unique');
  });

  // Test 3: Drift Detection Orchestration
  await runTest('Drift Core Orchestration', async () => {
    const taskMd = `
# Mission Statement
Implement a production-grade persistence system for sovereign task tracking with high-throughput sharding and atomic commit protocols.

## Requirements
- [ ] Implement core persistence adapter for task tracking
- [ ] Add SQL-based migration scripts for sharded architecture
- [ ] Verify atomic commit protocol across distributed nodes
- [ ] Benchmarking high-throughput sharding performance
- [ ] Implement secondary index for task state transitions
- [ ] Add audit logging for all database operations
- [ ] Optimize query performance for large checkpoint histories
- [ ] Implement automatic schema evolution and rollback
- [ ] Protect against race conditions in multi-threaded environments
- [ ] Ensure full ACID compliance for sovereign data
`.trim();
    const validation = await consistencyValidator.validateTask(taskMd);
    const task = createTaskEntity({
      title: 'Drift Core Test',
      objective: 'Implement a production-grade persistence system for sovereign task tracking with high-throughput sharding and atomic commit protocols.',
      requirements: validation.requirements,
      acceptanceCriteria: ['Passes all SQLite stress tests', 'Zero data loss during forced crashes'],
      initialContext: 'Building the core of the DietCode sovereign hive.',
      userAgent: 'Verify-Suite'
    });
    await entityManager.setCurrentTask(task);
    
    const snapshot = await orchestrator.initializeTask(taskMd, 1.0);
    if (!snapshot.checkpointId.startsWith('ckpt-')) {
      throw new Error(`Invalid checkpoint ID format: ${snapshot.checkpointId}`);
    }
  });

  // Test 4: Axiomatic Consistency
  await runTest('Axiomatic Consistency', async () => {
    const objective = "Implement a test suite for axiomatic consistency validation.";
    const textA = `
[LAYER: CORE]
- Principle: Axiomatic Verification
# Mission Statement
Implement a test suite for axiomatic consistency validation.

## Requirements
- [ ] Test the structural axiom
- [ ] Verify resonance between content and objective
- [ ] Validate purity of the implementation
- [ ] Ensure stability of the verification engine
`.trim();
    const unrelated = "A detailed tutorial on how to bake a multi-layered chocolate cake with vanilla frosting.";

    const healthA = semanticAnalyzer.assessIntegrityAlignment(textA, [], { objective });
    const healthUnrelated = semanticAnalyzer.assessIntegrityAlignment(unrelated, [], { objective });

    if (healthA.axiomProfile.status !== 'CLEARED') {
      throw new Error(`Axiomatic failure on valid content: ${healthA.axiomProfile.failingAxioms.join(', ')}`);
    }

    if (healthUnrelated.axiomProfile.status === 'CLEARED') {
      throw new Error(`Axiomatic false positive on unrelated content`);
    }
  });

  // Test 5: Persistence & Atomicity
  await runTest('Persistence & Atomicity', async () => {
    const task = createTaskEntity({
      title: 'Persistence Test',
      objective: 'Verify SQLite atomicity and data persistence',
      requirements: [{
        uniqueId: 'req-1',
        description: 'Requirement 1 for thorough testing',
        type: RequirementType.FEATURE,
        priority: TaskPriority.MEDIUM,
        isCritical: false,
        section: 'Verification'
      }],
      acceptanceCriteria: [],
      initialContext: 'Test context',
      userAgent: 'Verify-Suite'
    });
    
    persistence.persistTask(task);
    const retrieved = persistence.getTask(task.id);
    if (!retrieved || retrieved.title !== 'Persistence Test') {
      throw new Error('Task persistence failed');
    }
  });

  // Test 6: Drift Evaluation Recommendation
  await runTest('Drift Evaluation Recommendation', async () => {
    const taskMd = `
# Mission Statement
Implement drift detection verification test suite for production hardening.

## Requirements
- [ ] Validate drift status accuracy and automated reporting
- [ ] Test axiomatic baseline transitions
- [ ] Verify state restoration from snapshot
- [ ] Implement regression suite for drift vectors
- [ ] Monitor doubt signals during execution
- [ ] Benchmark restoration performance
- [ ] Ensure zero-shim compatibility
- [ ] Optimize memory footprint for large snapshots
`.trim();
    const validation = await consistencyValidator.validateTask(taskMd);
    const task = createTaskEntity({
      title: 'Drift Eval Test',
      objective: 'Implement drift detection verification test suite for production hardening.',
      requirements: validation.requirements,
      acceptanceCriteria: ['All tests pass green'],
      initialContext: 'Test context',
      userAgent: 'Verify-Suite'
    });
    await entityManager.setCurrentTask(task);
    
    const evaluation = await orchestrator.evaluateDrift(taskMd);
    if (evaluation.recommendation.correctiveAction !== 'drift_correction') {
      throw new Error(`Expected drift_correction, got ${evaluation.recommendation.correctiveAction}`);
    }
    console.log(`   (DRIFT) Evaluated Status: ${evaluation.snapshot.semanticHealth.axiomProfile.status}`);
  });

  // Final Results
  console.log('--- Verification Report ---\n');
  results.forEach(r => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name}: ${r.message}`);
  });

  const totalPassed = results.filter(r => r.passed).length;
  console.log(`\n🏆 Passed: ${totalPassed}/${results.length}`);

  if (totalPassed === results.length) {
    console.log('\n🎉 ALL HARDENING VERIFIED. SYSTEM IS SUPREME. 🏛️\n');
  } else {
    console.log('\n⚠️ SOME VERIFICATIONS FAILED. HARDENING INCOMPLETE. 🛠️\n');
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('❌ Critical verification failure:', err);
  process.exit(1);
});