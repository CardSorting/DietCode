import { Core } from './Core';

export class AuditRecorder {
  private constructor() {}
  /**
   * Check if a path has already been bypassed.
   */
  static async isBypassed(path: string): Promise<boolean> {
    const db = await Core.db();
    const result = await (db as any)
      .selectFrom('joy_bypasses' as any)
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
      .insertInto('joy_bypasses' as any)
      .values({
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
      .insertInto('audit_log' as any)
      .values({
        id: Math.random().toString(36).substring(7),
        type,
        message,
        data: data ? JSON.stringify(data) : null,
        timestamp: Date.now(),
      })
      .execute();
  }
}
