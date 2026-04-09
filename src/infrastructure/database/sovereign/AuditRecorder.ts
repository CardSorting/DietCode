/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { KyselyDatabase } from './DatabaseSchema';
import { Core } from './Core';

export class AuditRecorder {
  private constructor() {}
  
  /**
   * Check if a path has already been bypassed.
   */
  static async isBypassed(path: string): Promise<boolean> {
    const db = (await Core.db()) as KyselyDatabase;
    const result = await db
      .selectFrom('hive_joy_bypasses')
      .selectAll()
      .where('path', '=', path)
      .executeTakeFirst();
    return !!result;
  }

  /**
   * Record a bypass event for a specific path.
   */
  static async recordBypass(path: string, violationType: string): Promise<void> {
    const db = (await Core.db()) as KyselyDatabase;
    await db
      .insertInto('hive_joy_bypasses')
      .values({
        id: crypto.randomUUID(),
        path,
        violation_type: violationType,
        timestamp: Date.now(),
      })
      .onConflict((oc) => oc.column('path').doUpdateSet({ timestamp: Date.now() }))
      .execute();
  }

  /**
   * Record an audit log entry.
   */
  static async recordAudit(type: string, message: string, data?: any): Promise<void> {
    const db = (await Core.db()) as KyselyDatabase;
    await db
      .insertInto('hive_audit')
      .values({
        id: crypto.randomUUID(),
        type,
        message,
        data: data ? JSON.stringify(data) : null,
        timestamp: Date.now(),
      })
      .execute();
  }
}
