/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Standardized knowledge and pattern types for Sovereign Memory.
 */

export enum KnowledgeType {
  PATTERN = 'pattern', // Repeating code styles or architectural rules
  FACT = 'fact', // Project-specific information (e.g., config locations)
  LEARNING = 'learning', // High-level task outcome or cognitive realization
}

export interface KnowledgeItem {
  id: string;
  key: string;
  value: string;
  type: KnowledgeType;
  confidence: number; // 0.0 to 1.0
  tags: string[];
  metadata?: Record<string, any>;
  lastAccessed?: string;
  createdAt: string;
}

export interface KnowledgeRepository {
  save(item: KnowledgeItem): Promise<void>;
  findRelevant(query: string, limit: number): Promise<KnowledgeItem[]>;
  getAll(): Promise<KnowledgeItem[]>;
}
