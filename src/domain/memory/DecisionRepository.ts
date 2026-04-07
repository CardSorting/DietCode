/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Interface for auditing agent decisions.
 */

export interface DecisionRepository {
  /**
   * Records a decision made by the agent.
   */
  recordDecision(
    taskId: string,
    agentId: string,
    repoPath: string,
    decision: string,
    rationale: string,
    knowledgeIds?: string[],
  ): Promise<void>;

  /**
   * Ingests code outcome into knowledge base.
   */
  ingestKnowledge(
    userId: string,
    type: string,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<string>;
}
