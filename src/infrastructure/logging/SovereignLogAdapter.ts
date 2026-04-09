/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Persistent Audit Logging — sinks logs into modular Sovereign infrastructure.
 * Implementation: LogService adapter.
 */

import type { LogEntry, LogMetadata } from '../../domain/logging/LogEntry';
import { LogLevel } from '../../domain/logging/LogLevel';
import type { LogService } from '../../domain/logging/LogService';
import { Core } from '../database/sovereign/Core';

export class SovereignLogAdapter implements LogService {
  private minLevel: LogLevel = LogLevel.INFO;
  private currentSessionId: string | null = null;

  constructor(sessionId?: string) {
    if (sessionId) this.currentSessionId = sessionId;
  }

  setSessionId(sessionId: string): void {
    this.currentSessionId = sessionId;
  }

  error(message: string, data?: unknown, metadata?: LogMetadata): void {
    this.log(LogLevel.ERROR, message, data, metadata);
  }

  warn(message: string, data?: unknown, metadata?: LogMetadata): void {
    this.log(LogLevel.WARN, message, data, metadata);
  }

  info(message: string, data?: unknown, metadata?: LogMetadata): void {
    this.log(LogLevel.INFO, message, data, metadata);
  }

  debug(message: string, data?: unknown, metadata?: LogMetadata): void {
    this.log(LogLevel.DEBUG, message, data, metadata);
  }

  private log(level: LogLevel, message: string, data?: unknown, metadata?: LogMetadata): void {
    if (level < this.minLevel) return;

    // Console output for immediate visibility
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`, data || '');

    // Persistent Audit Log
    void this.persistAuditLog(level, message, data, metadata);
  }

  private async persistAuditLog(
    level: LogLevel,
    message: string,
    data?: unknown,
    metadata?: LogMetadata,
  ): Promise<void> {
    try {
      const db = await Core.db();
      const id = globalThis.crypto.randomUUID();

      await (db as any)
        .insertInto('hive_audit' as any)
        .values({
          id,
          session_id: this.currentSessionId,
          type: level,
          message,
          data: data ? JSON.stringify(data) : null,
          timestamp: Date.now(),
        })
        .execute();
    } catch (error) {
      // Fail silently to prevent logging loops if DB is down
      console.error('❌ Failed to persist audit log:', error);
    }
  }

  logEntry(entry: LogEntry): void {
    this.log(entry.level, entry.message, entry.data, entry.metadata);
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  getMinLevel(): LogLevel {
    return this.minLevel;
  }
}
