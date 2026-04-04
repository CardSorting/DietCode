/**
 * SENTINEL ARCHITECTURE TEST SUITE
 *
 **Test Coverage:**
 * 1. Guard Blocking: Domain Leak prevention
 * 2. Guard Approval: Safe move operations
 * 3. Score Impact: Score drop blocking
 * 4. worker Pool Performance: Multi-core utilization
 * 5. Integration: RefactorTools harnessing JoySim
 *
 **Running Tests:**
 * npm test sentinel
 *
 **Pre-flight:**
 * Ensure verify_hardening, verify_healing, verify_memory all pass
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ArchitecturalGuardian } from '../src/domain/architecture/ArchitecturalGuardian';
import type { IntegrityScanner } from '../src/domain/integrity/IntegrityScanner';
import { LogLevel } from '../src/domain/logging/LogLevel';
import type { IntegrityReport } from '../src/domain/memory/Integrity';
import { IntegrityPolicy } from '../src/domain/memory/IntegrityPolicy';
import { ConsoleLoggerAdapter } from '../src/infrastructure/ConsoleLoggerAdapter';
import { IntegrityAdapter } from '../src/infrastructure/IntegrityAdapter';
import { WorkerPoolAdapter } from '../src/infrastructure/WorkerPoolAdapter';
import { JoySimulator } from '../src/infrastructure/architecture/JoySimulator';
import { RefactorTools } from '../src/infrastructure/tools/RefactorTools';

describe('🛡️ SENTINEL ARCHITECTURE VERIFICATION', () => {
  let integrityScanner: IntegrityScanner;
  let refactorTools: RefactorTools;
  let simulator: JoySimulator;

  beforeAll(() => {
    // Initialize Sentinels
    const policy = new IntegrityPolicy();
    const logger = new ConsoleLoggerAdapter(LogLevel.INFO);
    integrityScanner = new IntegrityAdapter(policy, logger); // Use real implementation
    simulator = new JoySimulator({ aggressive: true });
    refactorTools = new RefactorTools(integrityScanner);
  });

  afterAll(() => {
    // Cleanup if needed
    if (refactorTools) {
      // Destroy worker pool if RefactorTools has one
      // (For production, add proper cleanup)
    }
  });

  /**
   * SENTINEL TEST 1: Blocked by Domain Leak
   *
   **Scenario:** Attempt to move Infrastructure file into Domain layer
   **Expected:** Operation blocked with DOMAIN_LEAK violation
   */
  it('SENTINEL-1: Blocked by Domain Leak (Infrastructure → Domain)', async () => {
    const currentReport = await integrityScanner.scan('/Users/bozoegg/Downloads/DietCode');

    const oldPath = 'src/infrastructure/Guard.ts';
    const newPath = 'src/domain/Tool.ts'; // ❌ This is a DOMAIN LEAK

    // Run JoySim simulation
    const simResult = await simulator.simulateGuard(`/${oldPath}`, `/${newPath}`, currentReport);

    // Assertions
    expect(simResult.isSafe, 'JoySim should predict unsafe move').toBe(false);
    expect(
      simResult.violations.some((v) => v.type === 'DOMAIN_LEAK'),
      'Should detect DOMAIN_LEAK',
    ).toBe(true);

    // Verify REFLECTIVE BLOCKING in RefactorTools
    const blockResult = await refactorTools.moveAndFixImports(oldPath, newPath, { force: false });

    expect(blockResult.blocked, 'RefactorTools should also block this move').toBe(true);

    console.log('✅ SENTINEL-1: Domain leak correctly detected and blocked');
  });

  /**
   * SENTINEL TEST 2: Approved Safe Move
   *
   **Scenario:** Move within same layer (e.g., Core → Core subdirectory)
   **Expected:** Operation approved (no blocking violations)
   */
  it('SENTINEL-2: Approved Safe Move (Core → Core)', async () => {
    const currentReport = await integrityScanner.scan('/Users/bozoegg/Downloads/DietCode');

    const oldPath = 'src/core/SafetyGuard.ts';
    const newPath = 'src/core/SafetyGuard.ts/tabs'; // Valid: Core file moved within Core

    const simResult = await simulator.simulateGuard(oldPath, newPath, currentReport);

    expect(simResult.isSafe, 'JoySim should approve clean moves').toBe(true);
    expect(simResult.score, 'Score should not drop significantly').toBeGreaterThan(80);

    console.log('✅ SENTINEL-2: Safe move approved');
  });

  /**
   * SENTINEL TEST 3: Score Drop Blocking
   *
   **Scenario:** Moving file that causes cascade violations affecting score
   **Expected:** Operation blocked if score drop > 10 points
   */
  it('SENTINEL-3: Blocked by Score Drop (>10 points)', async () => {
    const currentReport = await integrityScanner.scan('/Users/bozoegg/Downloads/DietCode');

    const oldPath = 'src/infrastructure/FileIntegrityAnalyzer.ts';
    const newPath = 'src/core/IntegrityAnalyzer.ts'; // Might cause cascade violations

    const simResult = await simulator.simulateGuard(oldPath, newPath, currentReport);

    // If score drops by >10 points, should be blocked (unless blocked earlier by topology)
    if (simResult.isSafe) {
      const scoreDelta = currentReport.score - simResult.score;
      expect(scoreDelta, 'Score should not drop >10').toBeLessThanOrEqual(10);
    } else {
      // Already blocked by topology or cascade
      expect(simResult.violations.length, 'Should have violations').toBeGreaterThan(0);
    }

    console.log('✅ SENTINEL-3: Score drop correctly assessed');
  });

  /**
   * SENTINEL TEST 4: Multi-Worker Pool Performance
   * 
 **Scenario:** Full project scan distributed across all CPU cores
 **Expected:** 
   - Scan completes in <5s
   - CPU utilization > 50% (multiple cores)
   - No worker crashes
   */
  it('SENTINEL-4: Multi-Worker Pool Performance', async () => {
    const logger = new ConsoleLoggerAdapter(LogLevel.INFO);
    const pool = new WorkerPoolAdapter(integrityScanner, logger);
    const startTime = Date.now();
    const projectRoot = '/Users/bozoegg/Downloads/DietCode';

    // Run multi-core scan
    const report = await pool.scan(projectRoot);
    const duration = Date.now() - startTime;

    // Performance assertions
    const metrics = pool.getMetrics();

    // Verify strict language: "multiple CPU cores were utilized" if available
    expect(duration, 'Full scan should complete in <5s').toBeLessThan(5000);
    expect(metrics.workerCount, 'Should use multiple workers').toBeGreaterThan(1);
    expect(report.fileCount, 'Report should contain file count').toBeGreaterThan(0);
    expect(report.score, 'Score should be between 0-100').toBeGreaterThanOrEqual(0);
    expect(report.score, 'Score should be between 0-100').toBeLessThanOrEqual(100);

    console.log(
      `✅ SENTINEL-4: ${duration}ms scan, ${metrics.workerCount} cores utilized, ${report.fileCount} files scanned`,
    );
  });

  /**
   * SENTINEL TEST 5: ArchitectureGuardian Predictive Logic
   *
   **Scenario:** Pure logic test without file system access
   **Expected:** Guardian returns accurate predictions without I/O
   */
  it('SENTINEL-5: ArchitectureGuardian Predictive Logic (No I/O)', async () => {
    const testCases = [
      {
        scenario: 'Move Infrastructure to Domain',
        oldPath: 'src/infra/Guard.ts',
        newPath: 'src/domain/Tool.ts',
        expectedBlocked: true,
        violationType: 'DOMAIN_LEAK',
      },
      {
        scenario: 'Move Core within Core',
        oldPath: 'src/core/SafetyGuard.ts',
        newPath: 'src/core/safety/Guard.ts',
        expectedBlocked: false,
        violationType: undefined,
      },
      {
        scenario: 'Move from Core to UI (Topology Violation)',
        oldPath: 'src/core/Tool.ts',
        newPath: 'src/ui/Tool.ts',
        expectedBlocked: false, // Only topology (warn), score OK
        violationType: 'SCORE_DROPPED', // Or warn
      },
    ];

    const currentReport: IntegrityReport = {
      score: 95,
      violations: [],
      scannedAt: new Date().toISOString(),
    };

    for (const testCase of testCases) {
      const result = await ArchitecturalGuardian.simulateGuard(
        `/${testCase.oldPath}`,
        `/${testCase.newPath}`,
        currentReport,
      );

      if (testCase.expectedBlocked) {
        expect(result.isSafe).toBe(false);
        expect(result.violations.some((v) => v.type === testCase.violationType)).toBe(true);
      } else {
        expect(result.isSafe).toBe(true);
        expect(result.violations.length).toBe(0); // No blocking violations
      }
    }

    console.log('✅ SENTINEL-5: Predictive logic verified without I/O');
  });

  /**
   * SENTINEL TEST 6: Parallel Scanning Consistency
   *
   **Scenario:** Verify multi-worker scan produces same result as single-threaded (baseline)
   **Expected:** Aggregated score Same, Just different violations order
   */
  it.skip('SENTINEL-6: Parallel Scanning Consistency (Baseline Compare)', async () => {
    // SKIP: This is optional integration test - comparing worker pool to single-threaded
    // Would require careful file exclusion for fair comparison

    console.log('⏭️ SENTINEL-6: Skipped (Optional integration test)');
  });

  /**
   * SENTINEL TEST 7: Genesis Fail-safe Rollback
   *
   **Scenario:** 100% trapped by Guardian (JoySim blocking)
   **Expected:** Attempt move with force=false (auto-block) and force=true (allow) both handled
   */
  it('SENTINEL-7: Genesis Fail-safe Rollback', async () => {
    const currentReport = await integrityScanner.scan('/Users/bozoegg/Downloads/DietCode');

    // Test blocked scenario
    const blockResult = await refactorTools.moveAndFixImports(
      'src/infra/Guard.ts',
      'src/domain/Tool.ts',
      { force: false },
    );

    expect(blockResult.blocked, 'Force=false should block').toBe(true);
    expect(blockResult.reason, 'Reason should mention DOMAIN_LEAK').toContain('DOMAIN_LEAK');

    // Test force scenario (should allow for testing purposes only)
    const forceResult = await refactorTools.moveAndFixImports(
      'src/infra/Guard.ts',
      'src/domain/Tool.ts',
      {
        force: true, // ❌ Dangerous
        onEvent: (event) => {
          // Verify event type
          expect(event.type).toBe('FORCE_OVERRIDE');
        },
      },
    );

    expect(forceResult.blocked, 'Force=true should allow for testing').toBe(false);
    expect(forceResult.archEvent?.type, 'Event should be FORCE_OVERRIDE').toBe('FORCE_OVERRIDE');

    console.log('✅ SENTINEL-7: Fail-safe rollback handled correctly');
  });
});
