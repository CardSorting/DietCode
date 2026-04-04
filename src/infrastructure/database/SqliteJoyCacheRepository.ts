import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { LruCache } from '../tools/LruCache';
import { Core } from './sovereign/Core';

/**
 * [LAYER: INFRASTRUCTURE]
 * Persistent Dependency Index — translates structural AST state to O(1) Hive queries.
 * Utilizes Level 7 Memory Buffers for zero-latency file move tracking.
 */
export class SqliteJoyCacheRepository {
  private lru: LruCache<string, string[]>;

  constructor(capacity = 1000) {
    this.lru = new LruCache<string, string[]>(capacity);
  }

  /**
   * Updates the imports for a given file with Zero-Wait performance.
   */
  async updateImports(sourcePath: string, importedPaths: string[]): Promise<void> {
    // 1. TIER 1: Immediate Memory Update (LRU)
    this.lru.clear();

    // 2. TIER 2: Offload to Hive Push Buffer
    // 2a. Queue the Delete Task
    await Core.push({
      type: 'delete',
      table: 'hive_joy_imports',
      where: {
        column: 'source_path',
        operator: '=',
        value: sourcePath,
      },
    });

    // 2b. Queue the Insert Task
    if (importedPaths.length > 0) {
      const entries = importedPaths.map((imported) => ({
        id: crypto.randomUUID(),
        source_path: sourcePath,
        imported_path: imported,
      }));

      await Core.push({
        type: 'insert',
        table: 'hive_joy_imports',
        values: entries,
      });
    }
  }

  /**
   * Gets all files that import the target path.
   * TIERED: Checks L1 (LRU) first, then Level 7 (Hive Buffer), then L2 (Disk).
   */
  async getDependents(targetPath: string): Promise<string[]> {
    // 1. TIER 1: Memory (LRU)
    const cached = this.lru.get(targetPath);
    if (cached) return cached;

    // 2. TIER 2: Fluid Select from Hive
    const results = await Core.selectWhere('hive_joy_imports', {
      column: 'imported_path',
      operator: '=',
      value: targetPath,
    });

    const sourcePaths = results.map((r: any) => r.source_path);

    // 3. Populate L1
    this.lru.set(targetPath, sourcePaths);

    return sourcePaths;
  }

  /**
   * Pass 11: Structural Metrics
   * Calculates Afferent (Ca) and Efferent (Ce) coupling using Hive Shards.
   */
  async getMetrics(
    filePath: string,
  ): Promise<{ afferent: number; efferent: number; instability: number }> {
    const db = await Core.db();

    // Complex metrics use direct shard reads for grouping/counting
    const caResult = (await (db as any)
      .selectFrom('hive_joy_imports' as any)
      .select(({ fn }: any) => fn.count('id').as('count'))
      .where('imported_path', '=', filePath)
      .executeTakeFirst()) as any;

    const ca = Number(caResult?.count || 0);

    const ceResult = (await (db as any)
      .selectFrom('hive_joy_imports' as any)
      .select(({ fn }: any) => fn.count('id').as('count'))
      .where('source_path', '=', filePath)
      .executeTakeFirst()) as any;

    const ce = Number(ceResult?.count || 0);

    const instability = ca + ce === 0 ? 0 : ce / (ca + ce);

    return { afferent: ca, efferent: ce, instability };
  }

  /**
   * Identifies the project's "Architectural Anchors" (Highest Inbound Coupling).
   */
  async getTopArchitecturalAnchors(limit = 5): Promise<{ path: string; count: number }[]> {
    const db = await Core.db();
    const results = (await (db as any)
      .selectFrom('hive_joy_imports' as any)
      .select(['imported_path as path', ({ fn }: any) => fn.count('id').as('count')])
      .groupBy('imported_path')
      .orderBy('count', 'desc')
      .limit(limit)
      .execute()) as any;

    return results.map((r: any) => ({ path: r.path, count: Number(r.count) }));
  }

  /**
   * Removes a file from the cache (e.g., when it is deleted).
   */
  async removeFile(filePath: string): Promise<void> {
    this.lru.delete(filePath);
    this.lru.clear();

    // Level 7 background cleanup
    await Core.push({
      type: 'delete',
      table: 'hive_joy_imports',
      where: {
        column: 'source_path',
        operator: '=',
        value: filePath,
      },
    });

    await Core.push({
      type: 'delete',
      table: 'hive_joy_imports',
      where: {
        column: 'imported_path',
        operator: '=',
        value: filePath,
      },
    });
  }

  /**
   * Pass 15: Dead Code Detection
   * Identifies files with zero inbound dependencies in the Hive.
   */
  async getProjectOrphans(projectRoot: string): Promise<string[]> {
    const db = await Core.db();

    const importedRows = await (db as any)
      .selectFrom('hive_joy_imports' as any)
      .select('imported_path')
      .distinct()
      .execute();

    const importedPaths = new Set(importedRows.map((r: any) => r.imported_path));

    const allFiles: string[] = [];
    this.listTsFiles(path.join(projectRoot, 'src/domain'), allFiles);
    this.listTsFiles(path.join(projectRoot, 'src/infrastructure'), allFiles);
    this.listTsFiles(path.join(projectRoot, 'src/core'), allFiles);

    const orphans = allFiles
      .map((f) => path.relative(projectRoot, f))
      .filter((rel) => !importedPaths.has(rel))
      .filter(
        (rel) =>
          !rel.includes('index.ts') && !rel.includes('App.ts') && !rel.includes('contracts/'),
      );

    return orphans;
  }

  private listTsFiles(dir: string, fileList: string[]): void {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const name = path.join(dir, file);
      if (fs.statSync(name).isDirectory()) {
        this.listTsFiles(name, fileList);
      } else if (name.endsWith('.ts')) {
        fileList.push(name);
      }
    }
  }

  /**
   * Pass 18: Architectural Metrics Caching
   * Returns the cached violation count from the Hive if the hash matches.
   */
  async getCachedViolations(filePath: string, currentHash: string): Promise<number | null> {
    const results = await Core.selectWhere(
      'hive_joy_metrics',
      { column: 'path', operator: '=', value: filePath },
      { limit: 1 },
    );
    const result = results[0] as any;

    if (result && result.hash === currentHash) {
      return Number(result.violation_count);
    }
    return null;
  }

  /**
   * Pass 18: Architectural Metrics Persistence
   * Updates the cached metrics via Write-Behind Push.
   */
  async updateCachedViolations(filePath: string, count: number, hash: string): Promise<void> {
    await Core.push({
      type: 'upsert',
      table: 'hive_joy_metrics',
      values: {
        id: crypto.randomUUID(),
        path: filePath,
        violation_count: count,
        hash,
        last_scanned: Date.now(),
      },
      conflictTarget: 'path',
    });
  }
}
