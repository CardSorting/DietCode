/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Structural Delta Scoring — quantifies the architectural impact of changes.
 */

import type { SimulationResult } from './SimulationResult';

export class ArchitecturalImpactAnalyzer {
  /**
   * Calculates the architectural health delta between current state and proposed change.
   */
  calculateImpact(newViolations: number, currentViolations: number): SimulationResult {
    const delta = currentViolations - newViolations;

    let impact: 'positive' | 'negative' | 'neutral' = 'neutral';
    let message = 'Architectural stability maintained.';

    if (delta > 0) {
      impact = 'positive';
      message = `Simulation: Change RESOLVES ${delta} architectural violation(s).`;
    } else if (delta < 0) {
      impact = 'negative';
      message = `Simulation Warning: Change introduces ${Math.abs(delta)} new architectural violation(s).`;
    } else if (newViolations > 0) {
      message = `Simulation: Change maintains existing ${newViolations} violations.`;
    }

    // Scoring: 100 base, -10 per violation.
    const score = Math.max(0, 100 - newViolations * 10);

    return {
      scoreDelta: score,
      newViolations,
      projectHealthImpact: impact,
      message,
    };
  }
}
