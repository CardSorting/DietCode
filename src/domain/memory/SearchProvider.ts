/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic — the heart of the application.
 */

import type { KnowledgeItem } from './Knowledge';

export interface SearchProvider {
  /**
   * Performs a similarity or fuzzy search across the knowledge base.
   */
  search(query: string, items: KnowledgeItem[], limit: number): Promise<KnowledgeItem[]>;
}
