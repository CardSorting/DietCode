/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Project structure analysis and layer distribution
 */

export interface ProjectStructureAnalysis {
  totalLayers: number;
  layerDistribution: Record<string, number>;
  depth: number;
}
