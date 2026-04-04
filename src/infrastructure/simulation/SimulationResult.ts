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
