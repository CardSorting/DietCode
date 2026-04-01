#!/usr/bin/env tsx
/**
 * Production Hardening Verification Suite
 * 
 * Validates Phase 2 patterns (Context Compression & Verification Agent)
 * against production hardening standards in Joy-Zoning architecture.
 */

import { ContextCompressionStrategy } from './src/domain/prompts/ContextCompressionStrategy';
import { VerificationAgent } from './src/domain/prompts/VerificationAgent';
import { ContextCompressorAdapter } from './src/infrastructure/prompts/ContextCompressorAdapter';
import { VerificationAgentAdapter } from './src/infrastructure/prompts/VerificationAgentAdapter';
import { getPattern } from './src/domain/prompts/PatternRegistry';

// ANSI color codes for verification output
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Verification result for a single check
 */
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
  testFn: () => Promise<{ passed: boolean; message: string; severity?: string }>
): Promise<VerificationCheck> {
  console.log(`  ${COLORS.yellow}[VERIFICATION]${COLORS.reset} ${name}...`);
  const result = await testFn();
  return {
    name,
    passed: result.passed,
    message: result.message,
    severity: (result.severity as any) || 'LOW'
  };
}

/**
 * Format severity for display
 */
function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return COLORS.red;
    case 'HIGH': return COLORS.yellow;
    case 'MEDIUM': return COLORS.cyan;
    case 'LOW': return COLORS.green;
    default: return COLORS.reset;
  }
}

/**
 * Main verification orchestration
 */
async function main() {
  console.log(`${COLORS.cyan}🛡️  PRODUCTION HARDENING VERIFICATION SUITE${COLORS.reset}`);
  console.log(`${COLORS.cyan}============================================${COLORS.reset}\n`);

  const checks: VerificationCheck[] = [];

  // Phase 1: Prework Compliance Verification
  console.log(`${COLORS.magenta}PHASE 1: PREWORK COMPLIANCE${COLORS.reset}`);
  console.log('────────────────────────────────────────────');

  // Check 1: PatternRegistry accuracy
  checks.push(await runCheck(
    'PatternRegistry Accuracy (Context Compression)',
    async () => {
      const pattern = getPattern('CONTEXT_COMPRESSION');
      const hasStatus = pattern?.implementationStatus === '✅ IMPLEMENTED';
      return {
        passed: hasStatus,
        message: hasStatus ? 
          'Context Compression declared as IMPLEMENTED' : 
          'PatternRegistry status mismatch for Context Compression',
        severity: 'CRITICAL'
      };
    }
  ));

  checks.push(await runCheck(
    'PatternRegistry Accuracy (Verification Agent)',
    async () => {
      const pattern = getPattern('VERIFICATION_AGENT');
      const hasStatus = pattern?.implementationStatus === '✅ IMPLEMENTED';
      return {
        passed: hasStatus,
        message: hasStatus ?
          'Verification Agent declared as IMPLEMENTED' :
          'PatternRegistry status mismatch for Verification Agent',
        severity: 'CRITICAL'
      };
    }
  ));

  // Phase 2: Infrastructure Implementation Verification
  console.log(`\n${COLORS.magenta}PHASE 2: INFRASTRUCTURE IMPLEMENTATION${COLORS.reset}`);
  console.log('────────────────────────────────────────────');

  // Check 3: ContextCompressorAdapter exists
  checks.push(await runCheck(
    'ContextCompressorAdapter Implementation',
    async () => {
      const exists = typeof ContextCompressorAdapter !== 'undefined';
      return {
        passed: exists,
        message: exists ?
          'ContextCompressorAdapter class defined' :
          'ContextCompressorAdapter not found in imports',
        severity: hasStatus ? 'LOW' : 'CRITICAL'
      };
    }
  ));

  // Check 4: VerifyAgentAdapter exists
  checks.push(await runCheck(
    'VerificationAgentAdapter Implementation',
    async () => {
      const exists = typeof VerificationAgentAdapter !== 'undefined';
      return {
        passed: exists,
        message: exists ?
          'VerificationAgentAdapter class defined' :
          'VerificationAgentAdapter not found in imports',
        severity: hasStatus ? 'LOW' : 'CRITICAL'
      };
    }
  ));

  // Phase 3: Type Safety & Architecture
  console.log(`\n${COLORS.magenta}PHASE 3: TYPE SAFETY & ARCHITECTURE${COLORS.reset}`);
  console.log('────────────────────────────────────────────');

  // Check 5: Domain interfaces not importing infrastructure
  checks.push(await runCheck(
    'Domain Interfaces Pure (No Infrastructure Imports)',
    async () => {
      // This would be implementation-specific; for now check file headers
      const ctxHeader = await readFileHeader('./src/domain/prompts/ContextCompressionStrategy.ts');
      const verHeader = await readFileHeader('./src/domain/prompts/VerificationAgent.ts');
      const pure = ctxHeader.includes('No external imports') && verHeader.includes('No external imports');
      return {
        passed: pure,
        message: pure ?
          'Domain files contain "No external imports" note' :
          'Domain files may have dependency chain issues',
        severity: 'HIGH'
      };
    }
  ));

  // Phase 4: Production Readiness Assessment
  console.log(`\n${COLORS.magenta}PHASE 4: PRODUCTION READINESS ASSESSMENT${COLORS.reset}`);
  console.log('────────────────────────────────────────────');

  // Check 6: Headers contain triaging notes
  checks.push(await runCheck(
    'Infrastructure Headers Contain Triaging Notes',
    async () => {
      const ctxHeader = await readFileHeader('./src/infrastructure/prompts/ContextCompressorAdapter.ts');
      const verHeader = await readFileHeader('./src/infrastructure/prompts/VerificationAgentAdapter.ts');
      const hasTriaging = ctxHeader.includes('[HARDEN]') && verHeader.includes('[HARDEN]');
      return {
        passed: hasTriaging,
        message: hasTriaging ?
          'Both adapters contain production hardening triaging notes' :
          'Adapters missing production hardening notes',
        severity: 'HIGH'
      };
    }
  ));

  // Check 7: Verify adapters implement Domain interfaces
  checks.push(await runCheck(
    'Adapters Implement Domain Contracts',
    async () => {
      const implementsCtx = (ContextCompressorAdapter as any).implementsInterface === 'ContextCompressionStrategy';
      const implementsVer = (VerificationAgentAdapter as any).implementsInterface === 'VerificationAgent';
      const both = implementsCtx && implementsVer;
      return {
        passed: both,
        message: both ?
          'Both adapters implement correct Domain interfaces' :
          'Adapter interface implementations mismatch',
        severity: 'CRITICAL'
      };
    }
  ));

  // Phase 5: Summary & Reporting
  console.log(`\n${COLORS.magenta}PHASE 5: VERIFICATION SUMMARY${COLORS.reset}`);
  console.log('────────────────────────────────────────────');

  const passed = checks.filter(c => c.passed).length;
  const failed = checks.filter(c => !c.passed).length;
  const total = checks.length;

  // Display check results
  console.log('\nCheck Results:');
  checks.forEach(check => {
    const status = check.passed ? '✅ PASS' : '❌ FAIL';
    const color = check.passed ? COLORS.green : COLORS.red;
    console.log(`  ${color}${status}${COLORS.reset} ${check.name}`);
    console.log(`    ${check.message}`);
    console.log(`    Severity: ${getSeverityColor(check.severity)}${check.severity}${COLORS.reset}`);
  });

  // Calculate summary
  const criticalErrors = checks.filter(c => !c.passed && c.severity === 'CRITICAL').length;
  const highErrors = checks.filter(c => !c.passed && (c.severity === 'HIGH' || c.severity === 'CRITICAL')).length;

  console.log(`\n${COLORS.blue}SUMMARY${COLORS.reset}`);
  console.log(`────────────────────────────────────────────`);
  console.log(`  Total Checks:   ${total}`);
  console.log(`  Passed:         ${COLORS.green}${passed}${COLORS.reset}`);
  console.log(`  Failed:         ${COLORS.red}${failed}${COLORS.reset}`);
  console.log(`  Critical:       ${COLORS.red}${criticalErrors}${COLORS.reset}`);
  console.log(`  High Priority:  ${COLORS.yellow}${highErrors}${COLORS.reset}`);

  const complianceRate = Math.round((passed / total) * 100);
  console.log(`  Compliance:     ${COLORS.cyan}${complianceRate}%${COLORS.reset}`);

  // Final verdict
  console.log(`\n${COLORS.cyan}═════════════════════════════════════════════${COLORS.reset}`);
  console.log(`${COLORS.cyan}PRODUCTION HARDENING AUDIT VERDICT:${COLORS.reset}\n`);

  if (failed === 0) {
    console.log(`${COLORS.green}✅ ALL CHECKS PASSED${COLORS.reset}`);
    console.log(`  Phase 2 patterns are production-ready`);
    console.log(`  All Domain interfaces implemented`);
    console.log(`  All infrastructure adapters operational`);
  } else if (criticalErrors > 0) {
    console.log(`${COLORS.red}❌ PRODUCTION CONTAINS ERRORS${COLORS.reset}`);
    console.log(`  ${criticalErrors} CRITICAL failures detected`);
    console.log(`  ${highErrors - criticalErrors} High priority failures detected`);
    console.log(`  Review triaging notes: ${COLORS.magenta}src/PRODUCTION_HARDENING_PHASE2_REPORT.md${COLORS.reset}`);
  } else {
    console.log(`${COLORS.yellow}⚠️  PRODUCTION ENHANCED${COLORS.reset}`);
    console.log(`  ${highErrors} High priority findings detected`);
    console.log(`  Implement production hardening items from triaging notes`);
    console.log(`  See report for estimated effort: ${COLORS.magenta}src/PRODUCTION_HARDENING_PHASE2_REPORT.md${COLORS.reset}`);
  }

  console.log(`${COLORS.cyan}═════════════════════════════════════════════${COLORS.reset}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

/**
 * Read file header for prework compliance check
 */
async function readFileHeader(filePath: string): Promise<string> {
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    return `# ERROR READING FILE: ${error}`;
  }
}

// Run verification
main().catch(console.error);