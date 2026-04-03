/**
 * [LAYER: DOMAIN]
 * Principle: Pure business logic — the heart of the application.
 */

export enum JobType {
  KNOWLEDGE_INGEST = 'KNOWLEDGE_INGEST',
  CODE_HEAL = 'CODE_HEAL',
  CODE_ANALYZE = 'CODE_ANALYZE',
  JOY_ZONING_HEAL = 'JOY_ZONING_HEAL'
}

export interface JobDefinition<T = any> {
  type: JobType;
  payload: T;
}

export interface QueueProvider {
  /**
   * Enqueues a new job for background processing.
   */
  enqueue<T>(job: JobDefinition<T>): Promise<string>;
}
