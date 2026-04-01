/**
 * [LAYER: DOMAIN]
 * Principle: Pure data model for structured logging.
 * No implementation details, only contract for log data structure.
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

export interface LogMetadata {
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  component?: string;
  nodeId?: string;
}

export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  data?: unknown;
  metadata: LogMetadata;
  thread?: string;
}

/**
 * Creates a structured log entry for system events.
 */
export function createLogEntry(
  level: LogLevel,
  message: string,
  data?: unknown,
  metadata: LogMetadata = {}
): LogEntry {
  return {
    level,
    timestamp: new Date().toISOString(),
    message,
    data,
    metadata,
    thread: 'main',
  };
}