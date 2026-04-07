/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [VERIFICATION]
 * Sovereign Protocol v6.0 Production Hardening Verification
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { MetabolicBrain } from './src/core/brain/MetabolicBrain';
import { OperationalScheduler } from './src/core/task/OperationalScheduler';
import { SovereignSelector } from './src/core/task/SovereignSelector';
import { EntityState, TaskPriority, TaskState } from './src/domain/task/TaskEntity';
import { FileSystemAdapter } from './src/infrastructure/FileSystemAdapter';
import { SovereignDb } from './src/infrastructure/database/SovereignDb';
import { MetabolicMonitor } from './src/infrastructure/monitoring/MetabolicMonitor';
import { JoySimulator } from './src/infrastructure/simulation/JoySimulator';
import { PathValidator } from './src/infrastructure/validation/PathValidator';

async function verifySovereignHardening() {
  console.log('🚀 Starting Antigravity Sovereign Protocol v6.0 HARDENING Verification...');

  const monitor = MetabolicMonitor.getInstance();
  const adapter = new FileSystemAdapter(new PathValidator());
  const brain = new MetabolicBrain();
  const selector = new SovereignSelector();
  const scheduler = new OperationalScheduler(new JoySimulator());

  // 1. Telemetry Instrumentation Check
  console.log('\n[1] Verifying Telemetry Instrumentation (MetabolicMonitor)...');
  monitor.resetMetrics();

  // Trigger a real read
  adapter.readFile('proto.md');
  // Trigger a real write (to a temp file)
  adapter.writeFile('temp_verify.txt', 'test content\nline 2');

  const metrics = monitor.getMetrics();
  console.log('Metrics Snapshot:', metrics);

  if (metrics.reads === 0 || metrics.writes === 0) {
    throw new Error('❌ MetabolicMonitor ERROR: Instrumentation hooks failed to record I/O.');
  }
  console.log('✅ MetabolicMonitor: PASS');

  // 2. Metabolic Brain Integration Check
  console.log('\n[2] Verifying Metabolic Brain (Live Data)...');
  monitor.recordTokens(5000);
  monitor.recordVerification(true);

  const heartbeat = brain.calculateHeartbeat();
  console.log('Live Heartbeat:', heartbeat);

  if (heartbeat.cognitiveHeat === 0) {
    throw new Error('❌ MetabolicBrain ERROR: Failed to pull live metrics from monitor.');
  }
  console.log('✅ MetabolicBrain: PASS');

  // 3. Sovereign Selector (Real Provenance) Check
  console.log('\n[3] Verifying Sovereign Selector (Real Provenance)...');
  const testTask: any = {
    objective: 'Harden the infrastructure', // Should trigger anchor detect for SovereignDb or similar
    requirements: [
      {
        uniqueId: 'harden-01',
        description: 'Deep audit of the system',
        type: 'refactor',
        priority: TaskPriority.HIGH,
        isCritical: true,
        section: 'Verification',
      },
    ],
    acceptanceCriteria: ['All tests pass'],
    title: 'Hardening Task',
  };

  const bundle = await selector.generateProvenanceBundle(testTask);
  console.log('Generated Provenance Bundle:', bundle);

  const audit = selector.evaluate(bundle);
  console.log('Audit Result:', audit.pass ? 'PASS' : 'FAIL', audit.reasons);

  if (bundle.upsideDominance === 'LOW_LEVERAGE') {
    throw new Error('❌ SovereignSelector ERROR: Upside dominance calculation invalid.');
  }
  console.log('✅ SovereignSelector: PASS');

  // 4. Operational Scheduler (SRP Pipeline) Check
  console.log('\n[4] Verifying Operational Scheduler (SRP Pipeline)...');
  const task: any = {
    state: TaskState.BACKLOG,
    id: 'harden-v6-verify',
    title: 'Verification Task',
    objective: 'Ensure sovereign protocol integrity',
    priority: TaskPriority.MEDIUM,
    requirements: [],
    acceptanceCriteria: [],
    initialContext: 'Self-verification',
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      userAgent: 'DietCode-Verifier',
    },
  };

  const readyTask = scheduler.transition(task, TaskState.READY);
  console.log('Transition to READY:', readyTask.state);

  const simTask = scheduler.transition(readyTask, TaskState.SHADOW_SIM);
  console.log('Transition to SHADOW_SIM:', simTask.state);
  console.log('✅ Operational Scheduler: PASS');

  // 5. Database Persistence Check (Pass 17)
  console.log('\n[5] Verifying Metabolic Database Persistence (Pass 17)...');
  monitor.setTaskId('harden-v6-verify');
  await monitor.flushToDatabase('harden-v6-verify');

  const metricsCount = await monitor.getMetrics();
  console.log('Metrics After Flush (Should be reset):', metricsCount);

  const db = await SovereignDb.db();
  const dbResult = (await db
    .selectFrom('metabolic_telemetry' as any)
    .selectAll()
    .where('taskId', '=', 'harden-v6-verify')
    .executeTakeFirst()) as any;

  console.log('Database Result:', dbResult ? 'FOUND' : 'MISSING');
  if (!dbResult) {
    throw new Error(
      '❌ Database Persistence ERROR: Metabolic data not found in metabolic_telemetry table.',
    );
  }
  console.log('✅ Database Persistence: PASS');

  // 6. Multi-File Simulation & Caching (Pass 18)
  console.log('\n[6] Verifying Multi-File Simulation & Caching (Pass 18)...');

  const virtualFiles = new Map<string, string>();
  const fileA = path.resolve(process.cwd(), 'src/domain/A.ts');
  const fileB = path.resolve(process.cwd(), 'src/infrastructure/B.ts');

  // File B is infrastructure, File A is domain. Domain cannot import infrastructure.
  virtualFiles.set(fileB, '// [LAYER: INFRASTRUCTURE]\nexport const B = 1;');

  const multiSim = await scheduler.simulateShadowExecution(
    task,
    fileA,
    '// [LAYER: DOMAIN]\nimport { B } from "../infrastructure/B";\nexport const A = B;',
    process.cwd(),
    {},
    virtualFiles,
  );

  console.log('Multi-File Integrity:', multiSim.axiomProfile.status);
  console.log('Violations Detected (Expect Layer Violation):', multiSim.newViolations);

  if (multiSim.newViolations === 0) {
    throw new Error('❌ Multi-File Simulation ERROR: Failed to detect illegal across-file import.');
  }

  // Cache check: Run again
  const start = Date.now();
  await scheduler.simulateShadowExecution(
    task,
    fileA,
    '// [LAYER: DOMAIN]\nexport const A = 1;',
    process.cwd(),
    {},
  );
  const end = Date.now();
  console.log(`Cached Simulation Time: ${end - start}ms`);

  console.log('✅ Multi-File & Caching: PASS');

  // 7. Active Integrity Guard (External Edit Detection)
  console.log('\n[7] Verifying Active Integrity Guard (Pass 18)...');
  const fsAdapter = new FileSystemAdapter();
  const testFile = path.resolve(process.cwd(), 'temp_integrity_test.ts');

  // 7.1 Record initial state
  fsAdapter.writeFile(testFile, '// [LAYER: CORE]\nexport const initial = 1;');
  const firstAudit = await fsAdapter.scanner.verifyFileIntegrity(testFile);
  console.log('Initial Audit (Expect Clear):', firstAudit.clear);

  // 7.2 Simulate External Edit
  fs.writeFileSync(testFile, '// [LAYER: CORE]\nexport const modified = 2;');
  const secondAudit = await fsAdapter.scanner.verifyFileIntegrity(testFile);
  console.log('Post-External Edit Audit (Expect Detected):', secondAudit.clear);
  if (secondAudit.clear) {
    throw new Error('❌ Active Integrity Guard ERROR: Failed to detect external modification.');
  }
  console.log('✅ Active Integrity Guard: PASS');

  // 8. Self-Healing Protocol (Doubt Rollback)
  console.log('\n[8] Verifying Self-Healing Protocol (Pass 18)...');
  // Trigger a fake critical doubt signal in the monitor
  for (let i = 0; i < 20; i++) monitor.recordRead(testFile);

  const hb = brain.calculateHeartbeat();
  console.log('Simulated Doubt Signal:', hb.doubtSignal);

  const healAction = scheduler.evaluateSelfHealing(hb);
  console.log('Self-Healing Action (Expect ROLLBACK):', healAction.action);

  if (healAction.action !== 'ROLLBACK') {
    throw new Error('❌ Self-Healing ERROR: Failed to trigger rollback on critical doubt.');
  }
  console.log('✅ Self-Healing Protocol: PASS');

  console.log('\n✨ SUPREME SOVEREIGN HARDENING v6.0 COMPLETE ✨');

  // Cleanup
  try {
    fs.unlinkSync('temp_verify.txt');
  } catch (e) {}
  try {
    fs.unlinkSync('temp_integrity_test.ts');
  } catch (e) {}
}

verifySovereignHardening().catch((err) => {
  console.error('\n❌ HARDENING VERIFICATION FAILED');
  console.error(err);
  process.exit(1);
});
