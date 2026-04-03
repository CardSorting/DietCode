import { Core } from './Core';

export class ScoringCache {
  /**
   * Get cached scoring result by content hash.
   */
  static async getScoringCache(hash: string): Promise<any | null> {
    const db = await Core.db();
    const result = await (db as any).selectFrom('scoring_cache' as any)
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
    await (db as any).insertInto('scoring_cache' as any)
      .values({
        hash,
        result: JSON.stringify(result),
        timestamp: Date.now()
      })
      .onConflict((oc: any) => oc.column('hash').doUpdateSet({
        result: JSON.stringify(result),
        timestamp: Date.now()
      }))
      .execute();
  }
}
