/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
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

/**
 * Repository interface for search operations with persistence.
 * Infrastructure implementations (e.g., SqliteSearchRepository) implement this.
 */
export interface SearchRepository extends SearchProvider {
  /**
   * Index knowledge items for efficient searching.
   */
  index(items: KnowledgeItem[]): Promise<void>;

  /**
   * Remove items from the search index.
   */
  remove(items: KnowledgeItem[]): Promise<void>;

  /**
   * Load index - used during initialization.
   */
  loadIndex(): Promise<KnowledgeItem[]>;

  /**
   * Find the closest match to a query string
   */
  findClosest(query: string, root: string): Promise<{ path: string } | null>;
}
