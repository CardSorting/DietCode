/**
 * [LAYER: DOMAIN]
 * Principle: Pure model for cognitive code integrity (Validation).
 */

export interface SyntaxError {
  line: number;
  column: number;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: SyntaxError[];
}

export interface ValidationRepository {
  /**
   * Validates a file's content for syntax correctness.
   */
  validate(filePath: string, content: string): Promise<ValidationResult>;
}
