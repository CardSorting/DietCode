/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { Core } from './Core';

export class ScoringCache {
  private constructor() {}
  /**
   * Get cached scoring result by content hash.
   */
  static async getScoringCache(hash: string): Promise<any | null> {
    const db = await Core.db();
    const result = await (db as any)
      .selectFrom('hive_scoring_cache' as any)
      .selectAll()
      .where('hash', '=', hash)
      .executeTakeFirst();

    return result ? JSON.parse((result as any).result) : null;
  }

  /**
   * Store scoring result in cache.
   */
  static async setScoringCache(hash: string, result: any): Promise<void> {
    const db = await Core.db();
    await (db as any)
      .insertInto('hive_scoring_cache' as any)
      .values({
        id: globalThis.crypto.randomUUID(),
        hash,
        result: JSON.stringify(result),
        timestamp: Date.now(),
      })
      .onConflict((oc: any) =>
        oc.column('hash').doUpdateSet({
          result: JSON.stringify(result),
          timestamp: Date.now(),
        }),
      )
      .execute();
  }
}
