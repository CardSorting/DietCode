/**
 * [LAYER: DOMAIN]
 * Principle: Interface for logging service dependency injection.
 * Decouples Core logic from logging implementation details.
 * Allows injection of Console, File, Database, or composite loggers.
 */

import type { LogEntry, LogMetadata } from './LogEntry';
import type { LogLevel } from './LogLevel';

export interface LogService {
  /**
   * Logs an error message with optional data and metadata.
   */
  error(message: string, data?: unknown, metadata?: LogMetadata): void;

  /**
   * Logs a warning message with optional data and metadata.
   */
  warn(message: string, data?: unknown, metadata?: LogMetadata): void;

  /**
   * Logs an informational message with optional data and metadata.
   */
  info(message: string, data?: unknown, metadata?: LogMetadata): void;

  /**
   * Logs a debug message with optional data and metadata.
   */
  debug(message: string, data?: unknown, metadata?: LogMetadata): void;

  /**
   * Logs the entire log entry (lower-level for composite loggers).
   */
  logEntry(entry: LogEntry): void;

  /**
   * Sets minimum log level (e.g., INFO suppresses DEBUG).
   */
  setMinLevel(level: LogLevel): void;

  /**
   * Gets current minimum log level.
   */
  getMinLevel(): LogLevel;
}
