/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of code validation.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CodeSyntaxError, ValidationRepository, ValidationResult } from '../domain/Validation';

export class TypeScriptValidator implements ValidationRepository {
  /**
   * Validates a file's content using tsc --noEmit.
   */
  async validate(filePath: string, content: string): Promise<ValidationResult> {
    const ext = path.extname(filePath);
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      return { isValid: true, errors: [] };
    }

    // Create a temporary file for validation
    const tmpFile = path.join(path.dirname(filePath), `.tmp_validate_${path.basename(filePath)}`);
    fs.writeFileSync(tmpFile, content);

    try {
      // Using tsc with noEmit and a few basic flags
      const command = `npx tsc ${tmpFile} --noEmit --esModuleInterop --skipLibCheck --target esnext`;
      const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });

      return { isValid: true, errors: [] };
    } catch (error: any) {
      const output = error.stdout || error.stderr || '';
      const errors = this.parseErrors(output, tmpFile);

      return { isValid: false, errors };
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  }

  private parseErrors(output: string, fileName: string): CodeSyntaxError[] {
    const lines = output.split('\n');
    const errors: CodeSyntaxError[] = [];

    // Simple regex to extract line, column, and message from tsc output
    const regex = /:(\d+):(\d+) - error TS\d+: (.*)/;

    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        const lineNum = match[1] ? Number.parseInt(match[1], 10) : 0;
        const colNum = match[2] ? Number.parseInt(match[2], 10) : 0;
        const msgText = match[3] || 'Unknown error';

        errors.push({
          line: lineNum,
          column: colNum,
          message: msgText,
        });
      }
    }

    return errors;
  }
}
