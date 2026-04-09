/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
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
      table: 'hive_kb',
      values: {
        id: item.id,
        knowledge_key: item.key,
        knowledge_value: item.value,
        type: item.type,
        confidence: item.confidence,
        tags: JSON.stringify(item.tags),
        metadata: JSON.stringify(item.metadata || {}),
        created_at: item.createdAt,
      },
    });
  }

  async findRelevant(query: string, limit = 5): Promise<KnowledgeItem[]> {
    // Fluid Select: Automatically merges buffers & disk
    const results = await Core.selectWhere(
      'hive_kb',
      { column: 'knowledge_key', operator: 'LIKE', value: `%${query}%` },
      undefined,
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
    const results = await Core.selectWhere('hive_kb', []);

    return results.map((r: any) => ({
      ...r,
      key: r.knowledge_key,
      value: r.knowledge_value,
      tags: JSON.parse(r.tags),
      metadata: JSON.parse(r.metadata),
    }));
  }
}
