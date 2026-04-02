/**
 * [LAYER: DOMAIN]
 * Standardized system event types for DietCode lifecycle tracking.
 * Extracted to avoid circular dependency with EventBus (Core layer).
 */

export enum EventType {
  KNOWLEDGE_GAINED = 'knowledge_gained',
  HANDOVER_INITIATED = 'handover_initiated',
  PRUNING_COMPLETED = 'pruning_completed',
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
  SNAPSHOT_CREATED = 'snapshot_created',
  TOOL_CALL_START = 'tool_call_start',
  TOOL_CALL_SUCCESS = 'tool_call_success',
  TOOL_CALL_FAILURE = 'tool_call_failure',
  ATTACHMENT_RESOLVED = 'attachment_resolved',
  ERROR = 'error',
  
  // Prompt System Events
  PROMPT_REGISTERED = 'prompt_registered',
  PROMPT_ASSEMBLED = 'prompt_assembled',
  PROMPT_LOAD_ERROR = 'prompt_load_error',
  PROMPT_CONFLICT_RESOLVED = 'prompt_conflict_resolved',
  PROMPT_WARNING = 'prompt_warning',
  PROMPT_RETRY_ADVICE = 'prompt_retry_advice',
  PROMPT_OVERRIDE_SAFETY = 'prompt_override_safety',
  PROMPT_RIPPLE_EFFECT = 'prompt_ripple_effect',
  PROMPT_SUGGESTION_PATTERNS = 'prompt_suggestion_patterns',
  CONTEXT_LOADED = 'context_loaded',
  CONTEXT_OPTIMIZATION = 'context_optimization',
  IMPLEMENTATION_STARTED = 'implementation_started',
  IMPLEMENTATION_COMPLETED = 'implementation_completed',
  SYSTEM_ERROR = 'system_error',
}