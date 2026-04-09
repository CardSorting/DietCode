/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: Orchestration — coordinates the validation lifecycle.
 */

import { EventType } from '../../domain/Event';
import type { ValidationRepository, ValidationResult } from '../../domain/Validation';
import { HardenedValidationRepository } from '../../infrastructure/validation/HardenedValidationRepository';
import type { EventBus } from '../orchestration/EventBus';

export class ValidationService {
  constructor(
    private repository: ValidationRepository = new HardenedValidationRepository(),
    private eventBus?: EventBus,
  ) {}

  /**
   * Validates a proposed code change and emits the result.
   */
  async validate(filePath: string, content: string): Promise<ValidationResult> {
    const result = await this.repository.validate(filePath, content);

    if (!result.isValid) {
      this.eventBus?.publish(EventType.ERROR, {
        message: `Validation failed for ${filePath}`,
        errors: result.errors,
      });
    }

    return result;
  }

  /**
   * Validates a decision code (domain-specific validation)
   */
  async validateDecisionCode(code: string): Promise<ValidationResult> {
    // PRODUCTION HARDENING: Delegating to the actual repository logic
    return this.repository.validate('decision.ts', code);
  }
}
