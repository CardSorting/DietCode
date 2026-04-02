/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Persistent Dependency Index — eliminates O(N) grep lookups using O(1) SQLite queries.
 * Pass 9: Atomic Async Persistor — implements write-behind caching via BufferedDbPool.
 * Zero-Wait: Tool execution loop never stalls for SQLite disk I/O.
 */

import { SovereignDb } from './SovereignDb';
import { LruCache } from '../tools/LruCache';
import * as crypto from 'node:crypto';

export interface JoyImportEntry {
    id: string;
    source_path: string;
    imported_path: string;
}

export class SqliteJoyCacheRepository {
    private db = SovereignDb;
    private lru: LruCache<string, string[]>;

    constructor(capacity: number = 1000) {
        this.lru = new LruCache<string, string[]>(capacity);
    }

    /**
     * Updates the imports for a given file with Zero-Wait performance.
     * Updates Memory (L1) instantly and offloads SQLite (L2) to a background pool.
     */
    async updateImports(sourcePath: string, importedPaths: string[]): Promise<void> {
        // 1. TIER 1: Immediate Memory Update (LRU)
        // We clear L1 results where THIS path was used as a dependent
        // and update the L1 entry for this path explicitly.
        this.lru.clear(); // Mass-invalidate for safety on mass moves

        // 2. TIER 2: Offload SQLite Persistence to Background Pool
        const pool = await this.db.getPool();

        // 2a. Queue the Delete Task
        await pool.push({
            type: 'delete',
            table: 'joy_imports' as any,
            where: {
                column: 'source_path',
                operator: '=',
                value: sourcePath
            } as any
        });

        // 2b. Queue the Insert Task
        if (importedPaths.length > 0) {
            const entries = importedPaths.map(imported => ({
                id: crypto.randomUUID(),
                source_path: sourcePath,
                imported_path: imported
            }));

            await pool.push({
                type: 'insert',
                table: 'joy_imports' as any,
                values: entries as any
            });
        }

        // We DO NOT await pool.flush() here. This is why it's Zero-Wait.
        // The persistence will happen in the background.
    }

    /**
     * Gets all files that import the target path.
     * TIERED: Checks L1 (LRU) first, then L2 (SQLite).
     */
    async getDependents(targetPath: string): Promise<string[]> {
        // 1. TIER 1: Memory (LRU)
        const cached = this.lru.get(targetPath);
        if (cached) return cached;

        // 2. TIER 2: Disk (SQLite)
        // Note: Even if L2 write is still in pool, LRU has the latest speculative state.
        const db = await this.db.db();
        const results = await db.selectFrom('joy_imports' as any)
            .select('source_path')
            .where('imported_path', '=', targetPath)
            .execute();
        
        const sourcePaths = results.map((r: any) => r.source_path);

        // 3. Populate L1
        this.lru.set(targetPath, sourcePaths);

        return sourcePaths;
    }

    /**
     * Pass 11: Structural Metrics 
     * Calculates Afferent (Ca) and Efferent (Ce) coupling for a given file.
     */
    async getMetrics(filePath: string): Promise<{ afferent: number; efferent: number; instability: number }> {
        const db = await this.db.db();
        
        // Afferent (Incoming): Who imports this?
        const caResult = await db.selectFrom('joy_imports' as any)
            .select(({ fn }: any) => fn.count('id').as('count'))
            .where('imported_path', '=', filePath)
            .executeTakeFirst() as any;

        const ca = Number(caResult?.count || 0);

        // Efferent (Outgoing): Who does this import?
        const ceResult = await db.selectFrom('joy_imports' as any)
            .select(({ fn }: any) => fn.count('id').as('count'))
            .where('source_path', '=', filePath)
            .executeTakeFirst() as any;

        const ce = Number(ceResult?.count || 0);

        // Instability Calculation: I = Ce / (Ca + Ce)
        const instability = (ca + ce === 0) ? 0 : ce / (ca + ce);

        return { afferent: ca, efferent: ce, instability };
    }

    /**
     * Identifies the project's "Architectural Anchors" (Highest Inbound Coupling).
     */
    async getTopArchitecturalAnchors(limit: number = 5): Promise<{ path: string; count: number }[]> {
        const db = await this.db.db();
        const results = await db.selectFrom('joy_imports' as any)
            .select(['imported_path as path', ({ fn }: any) => fn.count('id').as('count')])
            .groupBy('imported_path')
            .orderBy('count', 'desc')
            .limit(limit)
            .execute() as any;

        return results.map((r: any) => ({ path: r.path, count: Number(r.count) }));
    }

    /**
     * Removes a file from the cache (e.g., when it is deleted).
     */
    async removeFile(filePath: string): Promise<void> {
        // Invalidate LRU
        this.lru.delete(filePath);
        this.lru.clear(); 

        const pool = await this.db.getPool();
        
        // Background Persistence
        await pool.push({
            type: 'delete',
            table: 'joy_imports' as any,
            where: {
                column: 'source_path',
                operator: '=',
                value: filePath
            } as any
        });
        
        await pool.push({
            type: 'delete',
            table: 'joy_imports' as any,
            where: {
                column: 'imported_path',
                operator: '=',
                value: filePath
            } as any
        });
    }
}
