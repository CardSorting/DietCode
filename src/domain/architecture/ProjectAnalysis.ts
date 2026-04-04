/**
 * [LAYER: DOMAIN]
 * Principle: Project structure analysis and layer distribution
 */

export interface ProjectStructureAnalysis {
  totalLayers: number;
  layerDistribution: Record<string, number>;
  depth: number;
}
