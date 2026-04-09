/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure data model for structured logging.
 * No implementation details, only contract for log data structure.
 */

import type { LogLevel } from './LogLevel';

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
  metadata: LogMetadata = {},
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
