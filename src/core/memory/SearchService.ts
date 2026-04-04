/**
 * [LAYER: CORE]
 * Principle: Orchestration, task coordination, prompt assembly
 * Violations: None
 *
 * Coordinates fuzzy path resolution operations.
 */

import type { SearchRepository } from '../../domain/memory/SearchProvider';

export class SearchService {
  constructor(private repository: SearchRepository) {}

  /**
   * Resolves a potentially imprecise file path to the closest existing file.
   */
  async resolveImprecisePath(query: string, root: string): Promise<string | null> {
    const match = await this.repository.findClosest(query, root);
    return match ? match.path : null;
  }
}
