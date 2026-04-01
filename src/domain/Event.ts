/**
 * [LAYER: DOMAIN]
 * Standardized system event types for DietCode lifecycle tracking.
 */

export enum EventType {
  SESSION_STARTED = 'session_started',
  PROMPT_RECEIVED = 'prompt_received',
  THINKING_STARTED = 'thinking_started',
  THINKING_COMPLETED = 'thinking_completed',
  TOOL_INVOKED = 'tool_invoked',
  TOOL_COMPLETED = 'tool_completed',
  TOOL_FAILED = 'tool_failed',
  RESPONSE_GENERATED = 'response_generated',
  ERROR_OCCURRED = 'error_occurred',
  SYSTEM_INFO_GATHERED = 'system_info_gathered',
  SKILL_LOADED = 'skill_loaded',
}

export interface SystemEvent {
  id: string;
  type: EventType;
  timestamp: string;
  data: Record<string, any>;
  metadata?: {
    sessionId?: string;
    agentId?: string;
    durationMs?: number;
  };
}
