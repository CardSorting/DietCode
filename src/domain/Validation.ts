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
