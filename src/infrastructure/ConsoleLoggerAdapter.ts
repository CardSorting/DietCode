/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Structured logging output to console.
 * Replaces all console.log calls with proper log level distinction.
 */

import type { LogEntry, LogMetadata } from '../domain/logging/LogEntry';
import { LogLevel } from '../domain/logging/LogLevel';
import type { LogService } from '../domain/logging/LogService';

export class ConsoleLoggerAdapter implements LogService {
  private minLevel: LogLevel = LogLevel.INFO;

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel;
  }

  /**
   * Sets minimum log level to filter debug and info messages.
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Gets current minimum log level setting.
   */
  getMinLevel(): LogLevel {
    return this.minLevel;
  }

  /**
   * Logs error message with stack trace handling.
   */
  error(message: string, data?: unknown, metadata?: LogMetadata): void {
    this.logEntry({
      level: LogLevel.ERROR,
      timestamp: new Date().toISOString(),
      message,
      data,
      metadata: metadata || {},
      thread: 'main',
    });
  }

  /**
   * Logs warning message for conditional failure scenarios.
   */
  warn(message: string, data?: unknown, metadata?: LogMetadata): void {
    this.logEntry({
      level: LogLevel.WARN,
      timestamp: new Date().toISOString(),
      message,
      data,
      metadata: metadata || {},
      thread: 'main',
    });
  }

  /**
   * Logs informational message for standard operations.
   */
  info(message: string, data?: unknown, metadata?: LogMetadata): void {
    this.logEntry({
      level: LogLevel.INFO,
      timestamp: new Date().toISOString(),
      message,
      data,
      metadata: metadata || {},
      thread: 'main',
    });
  }

  /**
   * Logs debug message for internal diagnostics.
   */
  debug(message: string, data?: unknown, metadata?: LogMetadata): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.logEntry({
        level: LogLevel.DEBUG,
        timestamp: new Date().toISOString(),
        message,
        data,
        metadata: metadata || {},
        thread: 'main',
      });
    }
  }

  /**
   * Central logging method that outputs to console with color coding.
   */
  logEntry(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase();
    const message = entry.message;
    const thread = entry.thread || 'main';
    const component = entry.metadata.component || '';
    const data = entry.data !== undefined ? ` | Data: ${JSON.stringify(entry.data)}` : '';

    const prefix = `[${timestamp}] [${thread}] [${level}] ${message}${data}`;
    const coloredPrefix = `${this.colorizeTimestamp(timestamp)} ${this.colorizeThread(thread)} ${this.colorizeLevel(entry.level)} ${message}${data}`;

    if (entry.level === LogLevel.ERROR) {
      console.error(coloredPrefix);
    } else if (entry.level === LogLevel.WARN) {
      console.warn(coloredPrefix);
    } else if (entry.level === LogLevel.DEBUG) {
      console.log(`  ${coloredPrefix}`);
    } else {
      // INFO and above
      console.log(coloredPrefix);
    }
  }

  /**
   * Determines if a log level should be output based on minLevel setting.
   */
  private shouldLog(level: LogLevel): boolean {
    const levelOrder: LogLevel[] = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levelOrder.indexOf(level) >= levelOrder.indexOf(this.minLevel);
  }

  /**
   * Colors timestamp output.
   */
  private colorizeTimestamp(timestamp: string): string {
    // Optimization: return plain text to avoid dependency on chalk/marked
    return timestamp;
  }

  /**
   * Colors thread identifier output.
   */
  private colorizeThread(thread: string): string {
    return `[${thread}]`;
  }

  /**
   * Colors log level output based on severity.
   */
  private colorizeLevel(level: LogLevel): string {
    const levelMap: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: 'DEBUG',
      [LogLevel.INFO]: 'INFO',
      [LogLevel.WARN]: 'WARN',
      [LogLevel.ERROR]: 'ERROR',
      [LogLevel.CRITICAL]: 'CRITICAL',
    };
    return levelMap[level];
  }
}
