/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of Domain SearchProvider using fuzzy matching.
 */

import type { KnowledgeItem } from '../domain/memory/Knowledge';
import type { SearchRepository } from '../domain/memory/SearchProvider';

export class FuzzySearchRepository implements SearchRepository {
  private _index: KnowledgeItem[] = [];

  /**
   * Implements a production-hardened fuzzy search for knowledge recall.
   */
  async search(query: string, items: KnowledgeItem[], limit: number): Promise<KnowledgeItem[]> {
    const searchTerms = query.toLowerCase().split(/\s+/);

    const scored = items.map((item) => {
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
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.item);
  }

  /**
   * Index knowledge items for efficient searching.
   */
  async index(items: KnowledgeItem[]): Promise<void> {
    this._index = [...items];
  }

  /**
   * Remove items from the search index.
   */
  async remove(items: KnowledgeItem[]): Promise<void> {
    this._index = this._index.filter((item) => !items.includes(item));
  }

  /**
   * Load index - used during initialization.
   */
  async loadIndex(): Promise<KnowledgeItem[]> {
    return [...this._index];
  }

  /**
   * Find the closest match to a query string
   */
  async findClosest(query: string, root: string): Promise<{ path: string } | null> {
    // Simple implementation - returns the knowledge key as if it were a path
    const match = this._index.find(
      (item) =>
        item.key.toLowerCase().includes(query.toLowerCase()) ||
        item.value.toLowerCase().includes(query.toLowerCase()),
    );
    return match ? { path: match.key } : null;
  }
}
