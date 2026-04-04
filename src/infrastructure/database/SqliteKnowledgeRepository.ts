import type { KnowledgeItem, KnowledgeRepository } from '../../domain/memory/Knowledge';
import { Core } from './sovereign/Core';

/**
 * Concrete implementation of KnowledgeRepository using BroccoliQ Hive.
 * Utilizes Write-Behind architecture for massless ingestion.
 */
export class SqliteKnowledgeRepository implements KnowledgeRepository {
  async save(item: KnowledgeItem): Promise<void> {
    // 2.0 Architectural Pattern: Push to Memory Buffer (Level 7)
    await Core.push({
      type: 'insert',
      table: 'knowledge_base',
      values: {
        id: item.id,
        knowledge_key: item.key,
        knowledge_value: item.value,
        type: item.type,
        confidence: item.confidence,
        tags: JSON.stringify(item.tags),
        metadata: JSON.stringify(item.metadata || {}),
        createdAt: item.createdAt,
      },
    });
  }

  async findRelevant(query: string, limit = 5): Promise<KnowledgeItem[]> {
    // Fluid Select: Automatically merges buffers & disk
    const results = await Core.selectWhere(
      'knowledge_base',
      { column: 'knowledge_key', operator: 'LIKE', value: `%${query}%` },
      { limit },
    );

    return results.map((r: any) => ({
      ...r,
      key: r.knowledge_key,
      value: r.knowledge_value,
      tags: JSON.parse(r.tags),
      metadata: JSON.parse(r.metadata),
    }));
  }

  async getAll(): Promise<KnowledgeItem[]> {
    const results = await Core.selectWhere('knowledge_base', []);

    return results.map((r: any) => ({
      ...r,
      key: r.knowledge_key,
      value: r.knowledge_value,
      tags: JSON.parse(r.tags),
      metadata: JSON.parse(r.metadata),
    }));
  }
}
