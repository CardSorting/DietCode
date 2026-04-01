/**
 * [LAYER: INFRASTRUCTURE]
 * Concrete implementation of KnowledgeRepository using SQLite and BufferedDbPool.
 */

import { SovereignDb } from './SovereignDb';
import type { KnowledgeItem, KnowledgeRepository } from '../../domain/Knowledge';

export class SqliteKnowledgeRepository implements KnowledgeRepository {
  async save(item: KnowledgeItem): Promise<void> {
    const db = await SovereignDb.db();
    
    await db.insertInto('knowledge_base' as any)
      .values({
        id: item.id,
        knowledge_key: item.key,
        knowledge_value: item.value,
        type: item.type,
        confidence: item.confidence,
        tags: JSON.stringify(item.tags),
        metadata: JSON.stringify(item.metadata || {}),
        createdAt: item.createdAt,
      } as any)
      .execute();
  }

  async findRelevant(query: string, limit: number = 5): Promise<KnowledgeItem[]> {
    const db = await SovereignDb.db();
    const results = await db
      .selectFrom('knowledge_base' as any)
      .selectAll()
      .where('knowledge_key' as any, 'like', `%${query}%`)
      .limit(limit)
      .execute();

    return results.map((r: any) => ({
      ...r,
      key: r.knowledge_key,
      value: r.knowledge_value,
      tags: JSON.parse(r.tags),
      metadata: JSON.parse(r.metadata),
    }));
  }

  async getAll(): Promise<KnowledgeItem[]> {
    const db = await SovereignDb.db();
    const results = await db
      .selectFrom('knowledge_base' as any)
      .selectAll()
      .execute();

    return results.map((r: any) => ({
      ...r,
      key: r.knowledge_key,
      value: r.knowledge_value,
      tags: JSON.parse(r.tags),
      metadata: JSON.parse(r.metadata),
    }));
  }
}
