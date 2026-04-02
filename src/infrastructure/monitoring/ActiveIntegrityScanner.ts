/**
 * [LAYER: CORE]
 * Principle: Active Integrity Guard — detecting "The Unseen Edit."
 * Pass 5: Supreme Sovereign Hardening.
 */

import { SovereignDb } from '../database/SovereignDb';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';

export class ActiveIntegrityScanner {
    /**
     * Verifies that the file on disk matches the last known state in the database.
     * Detects external edits performed outside the Sovereign Protocol.
     */
    async verifyFileIntegrity(filePath: string): Promise<{ clear: boolean; reason?: string }> {
        if (!fs.existsSync(filePath)) return { clear: true };

        const db = await SovereignDb.db();
        const context = await db.selectFrom('file_context' as any)
            .select(['signature', 'path'])
            .where('path', '=', filePath)
            .executeTakeFirst() as any;

        if (!context || !context.signature) {
            // First time seeing this file, record it
            const content = fs.readFileSync(filePath, 'utf8');
            const signature = this.calculateHash(content);
            await this.recordFileState(filePath, signature);
            return { clear: true };
        }

        const currentContent = fs.readFileSync(filePath, 'utf8');
        const currentSignature = this.calculateHash(currentContent);

        if (currentSignature !== context.signature) {
            // External Edit Detected!
            await db.updateTable('file_context' as any)
                .set({ externalEditDetected: 1 })
                .where('path', '=', filePath)
                .execute();
            
            return { 
                clear: false, 
                reason: `External Edit Detected: File content does not match last known Sovereign signature.` 
            };
        }

        return { clear: true };
    }

    /**
     * Records the current sovereign signature of a file.
     */
    async recordFileState(filePath: string, signature: string): Promise<void> {
        const db = await SovereignDb.db();
        await db.insertInto('file_context' as any)
            .values({
                path: filePath,
                state: 'SOVEREIGN',
                source: 'INTERNAL',
                signature,
                lastReadDate: Date.now(),
                externalEditDetected: 0
            })
            .onConflict((oc: any) => oc.column('path').doUpdateSet({
                signature,
                externalEditDetected: 0,
                lastReadDate: Date.now()
            }))
            .execute();
    }

    private calculateHash(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }
}
