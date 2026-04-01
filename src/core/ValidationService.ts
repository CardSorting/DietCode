/**
 * [LAYER: CORE]
 * Principle: Orchestration — coordinates the validation lifecycle.
 */

import type { ValidationRepository, ValidationResult } from '../domain/Validation';
import { EventBus } from './EventBus';
import { EventType } from '../domain/Event';

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
}
