/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of DecisionRepository using BufferedDbPool.
 */

import type { DecisionRepository } from '../../domain/memory/DecisionRepository';
import { Core } from './sovereign/Core';

export class SqliteDecisionRepository implements DecisionRepository {
  async recordDecision(
    taskId: string,
    agentId: string,
    repoPath: string,
    decision: string,
    rationale: string,
    knowledgeIds: string[] = [],
  ): Promise<void> {
    await Core.push({
      type: 'insert',
      table: 'decisions',
      values: {
        id: globalThis.crypto.randomUUID(),
        taskId,
        agentId,
        repoPath,
        decision,
        rationale,
        knowledgeIds: JSON.stringify(knowledgeIds),
        timestamp: Date.now(),
      },
    });
  }

  async ingestKnowledge(
    userId: string,
    type: string,
    content: string,
    metadata: Record<string, any> = {},
  ): Promise<string> {
    const id = globalThis.crypto.randomUUID();

    await Core.push({
      type: 'insert',
      table: 'knowledge',
      values: {
        id,
        userId,
        type,
        content,
        confidence: 1.0,
        metadata: JSON.stringify(metadata),
        createdAt: Date.now(),
      },
    });

    return id;
  }
}
