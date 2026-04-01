/**
 * [LAYER: CORE]
 * Principle: Orchestration — coordinates fuzzy path resolution.
 */

import { FuzzySearchRepository } from '../../infrastructure/FuzzySearchRepository';

export class SearchService {
  constructor(private repository: FuzzySearchRepository) {}

  /**
   * Resolves a potentially imprecise file path to the closest existing file.
   */
  async resolveImprecisePath(query: string, root: string): Promise<string | null> {
    const match = await this.repository.findClosest(query, root);
    return match ? match.path : null;
  }
}
