/**
 * [LAYER: CORE]
 * Principle: Automated Enforcement — scans files for JoyZoning violations after modification.
 */

import type { Hook } from '../../domain/hooks/HookContract';
import { HookPhase } from '../../domain/hooks/HookContract';
import { IntegrityService } from './IntegrityService';
import { ViolationType } from '../../domain/memory/Integrity';

export class JoyZoningHook implements Hook {
  public readonly name = 'JoyZoningGuard';
  public readonly phase = HookPhase.POST_EXECUTION;
  public readonly priority = 100; // High priority

  constructor(
    private integrityService: IntegrityService,
    private projectRoot: string
  ) {}

  async execute(params: { toolName: string; input: any; result?: any }): Promise<any> {
    const { toolName, input, result } = params;

    // Only process file-modifying tools
    if (!['write_file', 'move_file', 'patch_file', 'replace_file_content', 'multi_replace_file_content'].includes(toolName)) {
      return result;
    }

    const filePath = input.path || input.TargetFile || input.oldPath;
    if (!filePath || !filePath.endsWith('.ts')) {
      return result;
    }

    console.log(`🔍 [JoyZoning] Auto-scanning ${filePath} after ${toolName}...`);

    try {
      const report = await this.integrityService.scanFile(filePath, this.projectRoot);

      if (report.violations.length > 0) {
        console.warn(`⚠️  [JoyZoning] Found ${report.violations.length} architectural violation(s) in ${filePath}:`);
        
        for (const v of report.violations) {
          console.warn(`   - [${v.type}] ${v.message}`);
          
          if (v.type === ViolationType.MISPLACED_FILE) {
             console.warn(`   💡 NUDGE: Use 'RefactorTools.moveAndFixImports' to relocate this file properly.`);
          }
        }
        
        // We don't block the result, but we've logged the architectural debt
      } else {
        console.log(`✅ [JoyZoning] ${filePath} complies with architectural standards.`);
      }
    } catch (error) {
      console.error(`❌ [JoyZoning] Automated scan failed for ${filePath}:`, error);
    }

    return result;
  }
}
