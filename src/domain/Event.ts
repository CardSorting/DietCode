/**
 * [LAYER: DOMAIN]
 * Principle: Pure model for system-wide observability (Events).
 */

export enum EventType {
  TOOL_CALL_START = 'tool_call_start',
  TOOL_CALL_SUCCESS = 'tool_call_success',
  TOOL_CALL_FAILURE = 'tool_call_failure',
  ATTACHMENT_RESOLVED = 'attachment_resolved',
  CONTEXT_GATHERED = 'context_gathered',
  AGENT_THOUGHT = 'agent_thought',
  SNAPSHOT_CREATED = 'snapshot_created',
  ERROR = 'error',
}

export interface AgentEvent<T = any> {
  type: EventType;
  payload: T;
  timestamp: number;
  correlationId?: string;
}

export type EventSubscriber = (event: AgentEvent) => void;
