/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Implementation of DecisionRepository using BufferedDbPool.
 */

import { SovereignDb } from './SovereignDb';
import type { DecisionRepository } from '../../domain/DecisionRepository';

export class SqliteDecisionRepository implements DecisionRepository {
  async recordDecision(
    taskId: string,
    agentId: string,
    repoPath: string,
    decision: string,
    rationale: string,
    knowledgeIds: string[] = []
  ): Promise<void> {
    const pool = await SovereignDb.getPool();
    
    await pool.push({
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
      }
    } as any);
  }

  async ingestKnowledge(
    userId: string,
    type: string,
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const pool = await SovereignDb.getPool();
    const id = globalThis.crypto.randomUUID();
    
    await pool.push({
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
      }
    } as any);
    
    return id;
  }
}
