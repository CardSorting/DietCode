/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Simulation Results — unified metrics for architectural dry-runs.
 */

export interface SimulationResult {
  /** The predicted architectural health score (0-100). */
  scoreDelta: number;
  /** Number of new violations introduced by the change. */
  newViolations: number;
  /** Overall impact classification. */
  projectHealthImpact: 'positive' | 'negative' | 'neutral';
  /** Human-readable explanation of the simulation result. */
  message: string;
}
