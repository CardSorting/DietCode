/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implement Domain contracts with zero external shim logic.
 */

import type { 
  ValidationRepository, 
  ValidationResult, 
  CodeSyntaxError 
} from '../../domain/Validation';

export class HardenedValidationRepository implements ValidationRepository {
  /**
   * Validates a file's content for syntax correctness using static analysis.
   */
  async validate(filePath: string, content: string): Promise<ValidationResult> {
    const errors: CodeSyntaxError[] = [];
    const lines = content.split('\n');

    // 1. Basic Brace Balance Check
    const stack: { char: string; line: number; col: number }[] = [];
    const pairs: Record<string, string> = { '}': '{', ')': '(', ']': '[' };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      for (let j = 0; j < line.length; j++) {
        const char = line[j]!;
        if (['{', '(', '['].includes(char)) {
          stack.push({ char, line: i + 1, col: j + 1 });
        } else if (['}', ')', ']'].includes(char)) {
          const last = stack.pop();
          if (!last || last.char !== pairs[char]) {
            errors.push({
              line: i + 1,
              column: j + 1,
              message: `Unmatched closing character: "${char}"`,
            });
          }
        }
      }
    }

    while (stack.length > 0) {
      const remaining = stack.pop()!;
      errors.push({
        line: remaining.line,
        column: remaining.col,
        message: `Unclosed opening character: "${remaining.char}"`,
      });
    }

    // 2. Reserved Keyword as Identifier Check (Simple)
    const keywords = ['class', 'function', 'const', 'let', 'var', 'if', 'else', 'while', 'for'];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      for (const kw of keywords) {
        const regex = new RegExp(`\\b${kw}\\s*=\\b`, 'g');
        if (regex.test(line)) {
          errors.push({
            line: i + 1,
            column: line.indexOf(kw) + 1,
            message: `Reserved keyword "${kw}" cannot be used as an identifier`,
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.slice(0, 10), // Limit to top 10 errors
    };
  }
}
