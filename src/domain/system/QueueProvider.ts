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

export enum JobType {
  KNOWLEDGE_INGEST = 'KNOWLEDGE_INGEST',
  CODE_HEAL = 'CODE_HEAL',
  CODE_ANALYZE = 'CODE_ANALYZE',
  JOY_ZONING_HEAL = 'JOY_ZONING_HEAL',
  INTEGRITY_SHARD = 'INTEGRITY_SHARD',
  SEMANTIC_SHARD = 'SEMANTIC_SHARD',
  SEMANTIC_SCORING = 'SEMANTIC_SCORING',
  IMPACT_SCORING = 'IMPACT_SCORING',
  SHARDED_SCORING = 'SHARDED_SCORING',
  UNIFIED_SCAN = 'UNIFIED_SCAN',
}

export interface JobDefinition<T = unknown> {
  id?: string;
  type: JobType;
  payload: T;
  priority?: number; // 0 = standard, 1 = high
}

export interface QueueProvider {
  /**
   * Enqueues a new job for background processing.
   */
  enqueue<T>(job: JobDefinition<T>): Promise<string>;
}
