/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of robust path discovery (Fuzzy Search).
 */

import type { Filesystem } from '../domain/Filesystem';

export interface SearchResult {
  path: string;
  score: number;
}

export class FuzzySearchRepository {
  constructor(private filesystem: Filesystem) {}

  /**
   * Finds the closest matching file path in the workspace for a given query.
   */
  async findClosest(query: string, root: string): Promise<SearchResult | null> {
    const allFiles = await this.filesystem.walk(root);
    let bestMatch: SearchResult | null = null;

    for (const relativePath of allFiles) {
      const score = this.calculateScore(query, relativePath);
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { path: relativePath, score };
      }
    }

    // Threshold for a "good" match
    return (bestMatch && bestMatch.score > 0.6) ? bestMatch : null;
  }

  private calculateScore(query: string, target: string): number {
    const q = query.toLowerCase();
    const t = target.toLowerCase();

    if (q === t) return 1.0;
    if (t.includes(q)) return 0.9;

    // Simple overlapping character count score
    let matches = 0;
    const qParts = q.split(/[\/\.]/);
    const tParts = t.split(/[\/\.]/);
    
    for (const part of qParts) {
      if (tParts.includes(part)) matches++;
    }

    return matches / Math.max(qParts.length, tParts.length);
  }
}
