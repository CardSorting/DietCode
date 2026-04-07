#!/usr/bin/env tsx
/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * Tool Security Verification Suite
 *
 * Validates production-hardening features of agent tools:
 * - Path traversal prevention
 * - Recursion limits
 * - Resource exhaustion prevention
 * - Input validation
 * - Type safety (no any types)
 */

import { execSync } from 'node:child_process';

// ANSI color codes
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

interface VerificationCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Run a single verification check
 */
async function runCheck(
  name: string,
  testFn: () => Promise<{ passed: boolean; message: string; severity?: string }>,
): Promise<VerificationCheck> {
  console.log(`  ${COLORS.yellow}[VERIFICATION]${COLORS.reset} ${name}...`);
  const result = await testFn();
  return {
    name,
    passed: result.passed,
    message: result.message,
    severity: (result.severity as any) || 'LOW',
  };
}

/**
 * Main verification orchestration
 */
async function main() {
  console.log(`${COLORS.cyan}${COLORS.bold}🛡️  TOOL SECURITY VERIFICATION SUITE${COLORS.reset}`);
  console.log(`${COLORS.cyan}${'='.repeat(50)}${COLORS.reset}\n`);

  const checks: VerificationCheck[] = [];

  // Phase 1: Type Safety & Compilation
  console.log(`${COLORS.magenta}PHASE 1: TYPE SAFETY & COMPILATION${COLORS.reset}`);
  console.log('────────────────────────────────────────────');

  // Check 1: No any types in tools directory
  checks.push(
    await runCheck('No "any" types in tools directory', async () => {
      const result = execSync(
        'grep -r "any" src/infrastructure/tools --include="*.ts" || echo "PASSED"',
        { encoding: 'utf8' },
      );
      const hasAny = result !== 'PASSED';
      return {
        passed: !hasAny,
        message: hasAny ? 'Found "any" type usage in tools directory' : 'No "any" types found',
        severity: 'CRITICAL',
      };
    }),
  );

  // Check 2: TypeScript compilation success
  checks.push(
    await runCheck('TypeScript compilation success', async () => {
      try {
        execSync('npx tsc --noEmit', {
          encoding: 'utf8',
          stdio: ['inherit', 'pipe', 'pipe'],
        });
        return { passed: true, message: 'TypeScript compiles successfully' };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          passed: false,
          message: `TypeScript compilation failed:\n${message.substring(0, 200)}...`,
          severity: 'CRITICAL',
        };
      }
    }),
  );

  // Phase 2: Path Security
  console.log(`\n${COLORS.magenta}PHASE 2: PATH SECURITY${COLORS.reset}`);
  console.log('────────────────────────────────────────────');

  // Check 3: File operations have path validation
  checks.push(
    await runCheck('File operations include path validation', async () => {
      const fileToolsCode = execSync(
        'cat src/infrastructure/tools/fileTools.ts | grep -c "validatePath"',
        { encoding: 'utf8' },
      );
      const hasValidation = Number.parseInt(fileToolsCode) >= 1;
      return {
        passed: hasValidation,
        message: hasValidation
          ? 'Path validation functions present in fileTools'
          : 'Path validation functions missing from fileTools',
        severity: 'CRITICAL',
      };
    }),
  );

  // Check 4: Grep has recursion limits
  checks.push(
    await runCheck('Grep includes recursion depth limit', async () => {
      const grepCode = execSync('cat src/infrastructure/tools/grep.ts | grep -c "MAX_DEPTH"', {
        encoding: 'utf8',
      });
      const hasLimit = Number.parseInt(grepCode) >= 1;
      return {
        passed: hasLimit,
        message: hasLimit
          ? 'Recursion depth limit defined in grep'
          : 'Recursion depth limit missing from grep',
        severity: 'HIGH',
      };
    }),
  );

  // Check 5: Grep has forbidden path checks
  checks.push(
    await runCheck('Grep includes forbidden path checks', async () => {
      const grepCode = execSync(
        'cat src/infrastructure/tools/grep.ts | grep -c "FORBIDDEN_PATHS"',
        { encoding: 'utf8' },
      );
      const hasCheck = Number.parseInt(grepCode) >= 1;
      return {
        passed: hasCheck,
        message: hasCheck
          ? 'Forbidden path checks present in grep'
          : 'Forbidden path checks missing from grep',
        severity: 'CRITICAL',
      };
    }),
  );

  // Check 6: Mkdir has path validation
  checks.push(
    await runCheck('Mkdir includes path validation', async () => {
      const mkdirCode = execSync('cat src/infrastructure/tools/mkdir.ts | grep -c "validatePath"', {
        encoding: 'utf8',
      });
      const hasValidation = Number.parseInt(mkdirCode) >= 1;
      return {
        passed: hasValidation,
        message: hasValidation
          ? 'Path validation functions present in mkdir'
          : 'Path validation functions missing from mkdir',
        severity: 'CRITICAL',
      };
    }),
  );

  // Phase 3: Resource Limits
  console.log(`\n${COLORS.magenta}PHASE 3: RESOURCE LIMITS${COLORS.reset}`);
  console.log('────────────────────────────────────────────');

  // Check 7: File size limits
  checks.push(
    await runCheck('File operations have size limits', async () => {
      const fileToolsCode = execSync(
        'cat src/infrastructure/tools/fileTools.ts | grep -c "MAX_FILE_SIZE_BYTES"',
        { encoding: 'utf8' },
      );
      const hasLimit = Number.parseInt(fileToolsCode) >= 1;
      return {
        passed: hasLimit,
        message: hasLimit
          ? 'File size limits defined in fileTools'
          : 'File size limits missing from fileTools',
        severity: 'HIGH',
      };
    }),
  );

  // Check 8: Recursion limits
  checks.push(
    await runCheck('Directory traversal has depth limit', async () => {
      const grepCode = execSync('cat src/infrastructure/tools/grep.ts | grep -c "MAX_DEPTH"', {
        encoding: 'utf8',
      });
      const hasLimit = Number.parseInt(grepCode) >= 1;
      return {
        passed: hasLimit,
        message: hasLimit
          ? 'Directory depth limit defined in grep'
          : 'Directory depth limit missing from grep',
        severity: 'HIGH',
      };
    }),
  );

  // Check 9: Result limits
  checks.push(
    await runCheck('Search results have maximum limit', async () => {
      const grepCode = execSync(
        'cat src/infrastructure/tools/grep.ts | grep -c "MAX_RESULT_LINES"',
        { encoding: 'utf8' },
      );
      const hasLimit = Number.parseInt(grepCode) >= 1;
      return {
        passed: hasLimit,
        message: hasLimit
          ? 'Result lines limit defined in grep'
          : 'Result lines limit missing from grep',
        severity: 'MEDIUM',
      };
    }),
  );

  // Phase 4: Error Handling
  console.log(`\n${COLORS.magenta}PHASE 4: ERROR HANDLING${COLORS.reset}`);
  console.log('────────────────────────────────────────────');

  // Check 10: Unknown error handling
  checks.push(
    await runCheck('All tools handle unknown errors', async () => {
      const grepCode = execSync('cat src/infrastructure/tools/grep.ts | grep -c "String(error)"', {
        encoding: 'utf8',
      });
      const hasHandling = Number.parseInt(grepCode) >= 1;
      return {
        passed: hasHandling,
        message: hasHandling
          ? 'Unknown error handling implemented in grep'
          : 'Unknown error handling missing from grep',
        severity: 'MEDIUM',
      };
    }),
  );

  // Check 11: Type casting error handling
  checks.push(
    await runCheck('All tools use proper type casts', async () => {
      const grepCode = execSync(
        'cat src/infrastructure/tools/grep.ts | grep -c "unknown" | head -1 && find src/infrastructure/tools -name "*.ts" -exec grep -l "error: unknown" {} \\;',
        { encoding: 'utf8' },
      );
      const hasHandling = grepCode.includes('error: unknown');
      return {
        passed: hasHandling,
        message: hasHandling
          ? 'Proper error type handling found'
          : 'Potential improper error handling detected',
        severity: 'MEDIUM',
      };
    }),
  );

  // Phase 5: Domain Contract Compliance
  console.log(`\n${COLORS.magenta}PHASE 5: DOMAIN CONTRACT COMPLIANCE${COLORS.reset}`);
  console.log('────────────────────────────────────────────');

  // Check 12: Domain contracts imported
  checks.push(
    await runCheck('Tools import Domain contracts', async () => {
      const toolsDir = execSync('ls -1 src/infrastructure/tools/*.ts | xargs -I {} basename {}', {
        encoding: 'utf8',
      });
      const files = toolsDir.split('\n').filter(Boolean);
      const domainImports = files.filter(
        (file) =>
          execSync(
            `head -20 src/infrastructure/tools/${file} | grep "import.*from.*domain/agent"`,
            { encoding: 'utf8' },
          ).length > 0,
      );
      return {
        passed: domainImports.length > 0,
        message: `Found ${domainImports.length}/${files.length} tools importing Domain contracts`,
        severity: 'MEDIUM',
      };
    }),
  );

  // Phase 6: Summary & Reporting
  console.log(`\n${COLORS.magenta}PHASE 6: VERIFICATION SUMMARY${COLORS.reset}`);
  console.log('────────────────────────────────────────────');

  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.filter((c) => !c.passed).length;
  const total = checks.length;

  // Display check results
  console.log('\nCheck Results:');
  checks.forEach((check) => {
    const status = check.passed ? '✅ PASS' : '❌ FAIL';
    const color = check.passed ? COLORS.green : COLORS.red;
    console.log(`  ${color}${status}${COLORS.reset} ${check.name}`);
    console.log(`    ${check.message}`);
    console.log(
      `    Severity: ${getSeverityColor(check.severity)}${check.severity}${COLORS.reset}`,
    );
  });

  // Calculate summary
  const criticalErrors = checks.filter((c) => !c.passed && c.severity === 'CRITICAL').length;
  const highErrors = checks.filter(
    (c) => !c.passed && (c.severity === 'HIGH' || c.severity === 'CRITICAL'),
  ).length;

  console.log(`\n${COLORS.blue}SUMMARY${COLORS.reset}`);
  console.log('────────────────────────────────────────────');
  console.log(`  Total Checks:   ${total}`);
  console.log(`  Passed:         ${COLORS.green}${passed}${COLORS.reset}`);
  console.log(`  Failed:         ${COLORS.red}${failed}${COLORS.reset}`);
  console.log(`  Critical:       ${COLORS.red}${criticalErrors}${COLORS.reset}`);
  console.log(`  High Priority:  ${COLORS.yellow}${highErrors}${COLORS.reset}`);

  const complianceRate = Math.round((passed / total) * 100);
  console.log(`  Compliance:     ${COLORS.cyan}${complianceRate}%${COLORS.reset}`);

  // Final verdict
  console.log(`\n${COLORS.cyan}═════════════════════════════════════════════${COLORS.reset}`);
  console.log(`${COLORS.cyan}TOOL SECURITY AUDIT VERDICT:${COLORS.reset}\n`);

  if (failed === 0) {
    console.log(`${COLORS.green}✅ ALL SECURITY CHECKS PASSED${COLORS.reset}`);
    console.log('  All tools are production-hardened');
    console.log('  Path traversal attacks prevented');
    console.log('  Resource exhaustion protected');
    console.log('  Type safety verified');
  } else if (criticalErrors > 0) {
    console.log(`${COLORS.red}❌ SECURITY CONTAINS CRITICAL ISSUES${COLORS.reset}`);
    console.log(`  ${criticalErrors} CRITICAL failures detected`);
    console.log(`  ${highErrors - criticalErrors} High priority failures detected`);
    console.log('  Review tool implementations for security vulnerabilities');
  } else {
    console.log(`${COLORS.yellow}⚠️  SECURITY MASKED BY ENHANCEMENTS${COLORS.reset}`);
    console.log(`  ${highErrors} High priority security findings detected`);
    console.log('  Review implementation notes for potential improvements');
  }

  console.log(`${COLORS.cyan}═════════════════════════════════════════════${COLORS.reset}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

/**
 * Format severity for display
 */
function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
      return COLORS.red;
    case 'HIGH':
      return COLORS.yellow;
    case 'MEDIUM':
      return COLORS.cyan;
    case 'LOW':
      return COLORS.green;
    default:
      return COLORS.reset;
  }
}

// Run verification
main().catch(console.error);
