/**
 * [LAYER: CORE]
 * Principle: Orchestration — coordinates the validation lifecycle.
 */

import type { ValidationRepository, ValidationResult } from '../../domain/Validation';
import { EventBus } from '../orchestration/EventBus';
import { EventType } from '../../domain/Event';

export class ValidationService {
  constructor(
    private repository: ValidationRepository,
    private eventBus?: EventBus
  ) {}

  /**
   * Validates a proposed code change and emits the result.
   */
  async validate(filePath: string, content: string): Promise<ValidationResult> {
    const result = await this.repository.validate(filePath, content);
    
    if (!result.isValid) {
        this.eventBus?.publish(EventType.ERROR, { 
            message: `Validation failed for ${filePath}`,
            errors: result.errors 
        });
    }

    return result;
  }

  /**
   * Validates a decision code (domain-specific validation)
   */
  async validateDecisionCode(code: string): Promise<ValidationResult> {
    return {
      isValid: code.length > 0,
      errors: code.length === 0 ? [{ line: 1, column: 1, message: 'Empty code provided' }] : []
    };
  }
}
