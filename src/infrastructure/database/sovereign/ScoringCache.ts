/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { KyselyDatabase } from './DatabaseSchema';
import { Core } from './Core';

export class ScoringCache {
  private constructor() {}
  
  /**
   * Get cached scoring result by content hash.
   */
  static async getScoringCache(hash: string): Promise<any | null> {
    const db = (await Core.db()) as KyselyDatabase;
    const result = await db
      .selectFrom('hive_scoring_cache')
      .selectAll()
      .where('hash', '=', hash)
      .executeTakeFirst();

    return result ? JSON.parse(result.result) : null;
  }

  /**
   * Store scoring result in cache.
   */
  static async setScoringCache(hash: string, result: any): Promise<void> {
    const db = (await Core.db()) as KyselyDatabase;
    await db
      .insertInto('hive_scoring_cache')
      .values({
        id: crypto.randomUUID(),
        hash,
        result: JSON.stringify(result),
        timestamp: Date.now(),
      })
      .onConflict((oc) =>
        oc.column('hash').doUpdateSet({
          result: JSON.stringify(result),
          timestamp: Date.now(),
        }),
      )
      .execute();
  }
}
