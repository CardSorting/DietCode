/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as fs from 'node:fs';
import { SemanticIntegrityAnalyser } from './src/infrastructure/task/SemanticIntegrityAnalyser';

async function main() {
  const analyser = new SemanticIntegrityAnalyser();
  console.log('--- STARTING SOVEREIGN AUDIT (3.0) ---');
  const report = await analyser.runProjectAudit('./src');

  const markdown = `
# Project-Wide Integrity Audit (Axiom 3.0)

- **Timestamp**: ${report.timestamp.toISOString()}
- **Total Files Scanned**: ${report.totalFilesScanned}
- **Architectural Debt Score**: N/A (calculate from violations via duplicate architecture guard: score = 100 - violations.length * 10)

## Compliance Summary

- ✅ **Compliant**: ${report.compliantFilesCount}
- ⚠️ **Flagged**: ${report.flaggedFilesCount}
- 🚫 **Blocked**: ${report.blockedFilesCount}

## Remediation Plan

${report.remediationPlan.map((p) => `- ${p}`).join('\n')}

## Layer Breakdown

### Domain Layer (${report.resultsByLayer.domain?.length} files)
${report.resultsByLayer.domain?.map((r) => `- [${r.axiomProfile.status}] ${r.filePath} (${r.violations.length} violations)`).join('\n')}

### Infrastructure Layer (${report.resultsByLayer.infrastructure?.length} files)
${report.resultsByLayer.infrastructure
  ?.map((r) => {
    const ghost = r.violations.some((v) => v.message.includes('Ghost')) ? ' [GHOST]' : '';
    return `- [${r.axiomProfile.status}] ${r.filePath}${ghost}`;
  })
  .join('\n')}

### Core Layer (${report.resultsByLayer.core?.length} files)
${report.resultsByLayer.core?.map((r) => `- [${r.axiomProfile.status}] ${r.filePath}`).join('\n')}
  `;

  fs.writeFileSync('./integrity_audit.md', markdown);
  console.log('--- AUDIT COMPLETE: integrity_audit.md generated ---');
}

main().catch(console.error);
