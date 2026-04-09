/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: Active Integrity Guard — detecting "The Unseen Edit."
 * Pass 5: Supreme Sovereign Hardening.
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { Core } from '../database/sovereign/Core';
import type { KyselyDatabase } from '../database/sovereign/DatabaseSchema';

export class ActiveIntegrityScanner {
  /**
   * Verifies that the file on disk matches the last known state in the database.
   * Detects external edits performed outside the Sovereign Protocol.
   */
  async verifyFileIntegrity(filePath: string): Promise<{ clear: boolean; reason?: string }> {
    // Pass 18: Resilience — If core is not initialized, skip during bootstrap phase
    if (!Core.isAvailable()) return { clear: true };

    const db = (await Core.db()) as KyselyDatabase;
    const context = await db
      .selectFrom('hive_file_context')
      .select(['signature', 'path', 'external_edit_detected'])
      .where('path', '=', filePath)
      .executeTakeFirst();

    if (!fs.existsSync(filePath)) {
      if (context) {
        // File existed before but is now gone!
        await db
          .updateTable('hive_file_context')
          .set({ external_edit_detected: 1, state: 'MISSING' })
          .where('path', '=', filePath)
          .execute();
        
        return {
          clear: false,
          reason: 'External Delete Detected: File has vanished from the environment.',
        };
      }
      return { clear: true };
    }

    try {
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
        await db
          .updateTable('hive_file_context')
          .set({ external_edit_detected: 1 })
          .where('path', '=', filePath)
          .execute();

        return {
          clear: false,
          reason:
            'External Edit Detected: File content does not match last known Sovereign signature.',
        };
      }
    } catch (e: unknown) {
      if (e instanceof Error && (e as { code?: string }).code === 'ENOENT') return { clear: true }; // File vanished, ignore
      throw e;
    }

    return { clear: true };
  }

  /**
   * Records the current sovereign signature of a file.
   */
  async recordFileState(filePath: string, signature: string): Promise<void> {
    const db = (await Core.db()) as KyselyDatabase;
    await db
      .insertInto('hive_file_context')
      .values({
        id: globalThis.crypto.randomUUID(),
        path: filePath,
        state: 'SOVEREIGN',
        source: 'INTERNAL',
        signature,
        last_read_date: Date.now(),
        external_edit_detected: 0,
      })
      .onConflict((oc) =>
        oc.column('path').doUpdateSet({
          signature,
          external_edit_detected: 0,
          last_read_date: Date.now(),
        }),
      )
      .execute();
  }

  private calculateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
