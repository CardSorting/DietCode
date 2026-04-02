/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of Domain SearchProvider using fuzzy matching.
 */

import type { SearchProvider } from '../domain/memory/SearchProvider';
import type { KnowledgeItem } from '../domain/memory/Knowledge';

export class FuzzySearchRepository implements SearchProvider {
  /**
   * Implements a production-hardened fuzzy search for knowledge recall.
   */
  async search(query: string, items: KnowledgeItem[], limit: number): Promise<KnowledgeItem[]> {
    const searchTerms = query.toLowerCase().split(/\s+/);
    
    const scored = items.map(item => {
      let score = 0;
      const content = `${item.key} ${item.value} ${item.tags.join(' ')}`.toLowerCase();
      
      for (const term of searchTerms) {
        if (content.includes(term)) {
          score += 1;
          // Bonus for exact key match
          if (item.key.toLowerCase().includes(term)) score += 2;
        }
      }
      
      return { item, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.item);
  }
}
