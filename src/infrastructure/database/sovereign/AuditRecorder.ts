/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { Core } from './Core';

export class AuditRecorder {
  private constructor() {}
  /**
   * Check if a path has already been bypassed.
   */
  static async isBypassed(path: string): Promise<boolean> {
    const db = await Core.db();
    const result = await (db as any)
      .selectFrom('hive_joy_bypasses' as any)
      .selectAll()
      .where('path', '=', path)
      .executeTakeFirst();
    return !!result;
  }

  /**
   * Record a bypass event for a specific path.
   */
  static async recordBypass(path: string, violationType: string): Promise<void> {
    const db = await Core.db();
    await (db as any)
      .insertInto('hive_joy_bypasses' as any)
      .values({
        id: globalThis.crypto.randomUUID(),
        path,
        violation_type: violationType,
        timestamp: Date.now(),
      })
      .onConflict((oc: any) => oc.column('path').doUpdateSet({ timestamp: Date.now() }))
      .execute();
  }

  /**
   * Record an audit log entry.
   */
  static async recordAudit(type: string, message: string, data?: any): Promise<void> {
    const db = await Core.db();
    await (db as any)
      .insertInto('hive_audit' as any)
      .values({
        id: globalThis.crypto.randomUUID(),
        type,
        message,
        data: data ? JSON.stringify(data) : null,
        timestamp: Date.now(),
      })
      .execute();
  }
}
