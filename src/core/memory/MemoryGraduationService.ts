/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: Memory Graduation — promotes session-local insights to global KnowledgeBase.
 * Implementation: Knowledge extraction and persistence coordination.
 */

import { Core } from '../../infrastructure/database/sovereign/Core';

export interface LearnedFact {
  key: string;
  value: string;
  type: string;
  confidence: number;
  tags: string[];
  metadata?: any;
}

export class MemoryGraduationService {
  /**
   * Graduates a list of learned facts into the global Sovereign KnowledgeBase.
   * Only promotes facts with confidence above the threshold.
   */
  async graduate(facts: LearnedFact[], confidenceThreshold = 0.8): Promise<number> {
    const db = await Core.db();
    let promotedCount = 0;

    for (const fact of facts) {
      if (fact.confidence >= confidenceThreshold) {
        const id = globalThis.crypto.randomUUID();

        await (db as any)
          .insertInto('hive_kb' as any)
          .values({
            id,
            knowledge_key: fact.key,
            knowledge_value: fact.value,
            type: fact.key,
            confidence: fact.confidence,
            tags: fact.tags.join(','),
            metadata: fact.metadata ? JSON.stringify(fact.metadata) : null,
            created_at: new Date().toISOString(),
          })
          .execute();

        promotedCount++;
      }
    }

    console.log(
      `🎓 [Graduation] Promoted ${promotedCount}/${facts.length} facts to Sovereign KnowledgeBase.`,
    );
    return promotedCount;
  }

  /**
   * Finalize a session and bridge its local context.
   */
  async finalizeSession(sessionId: string): Promise<void> {
    const db = await Core.db();
    await (db as any)
      .updateTable('hive_agent_sessions' as any)
      .set({
        status: 'completed',
        end_time: Date.now(),
      })
      .where('id', '=', sessionId)
      .execute();

    console.log(`🏁 [Session] Session ${sessionId} finalized and graduated.`);
  }
}
