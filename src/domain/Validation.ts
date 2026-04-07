/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure model for cognitive code integrity (Validation).
 */

export interface CodeSyntaxError {
  line: number;
  column: number;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: CodeSyntaxError[];
}

export interface ValidationRepository {
  /**
   * Validates a file's content for syntax correctness.
   */
  validate(filePath: string, content: string): Promise<ValidationResult>;
}
