/**
 * [LAYER: DOMAIN]
 * Principle: Pure presentation contract, UI handles rendering
 * Prework Status: Not applicable (new file)
 * 
 * Defines type-safe webview communication protocol.
 * Separates UI concerns from core orchestration.
 */

/**
 * Message types for webview communication
 */
export enum WebViewMessageType {
  COMMAND = 'command', // Execute command in application
  STATE = 'state', // Transmit state data to UI
  STREAM = 'stream', // Streaming response from LLM
  ERROR = 'error', // Error notification
  LOG = 'log', // Log message
  HOOK = 'hook', // Hook event
  TOOL = 'tool', // Tool execution event
  READY = 'ready', // WebView is ready
  PING = 'ping', // Pong request
  PONG = 'pong', // Pong response
}

/**
 * WebView command payload
 */
export interface WebViewCommand {
  name: string;
  args?: Record<string, unknown>;
}

/**
 * State update payload
 */
export interface StateUpdate {
  key: string;
  value: unknown;
  timestamp: number;
}

/**
 * Tool execution event payload
 */
export interface ToolEvent {
  toolName: string;
  status: 'started' | 'succeeded' | 'failed';
  result?: unknown;
  error?: string;
  durationMs?: number;
}

/**
 * Hook execution event payload
 */
export interface HookEvent {
  hookName: string;
  phase: 'pre_tool_use' | 'tool_execution' | 'post_execution' | 'error_handler';
  success: boolean;
  result?: unknown;
  durationMs?: number;
}

/**
 * WebView message interface
 * 
 * Unified interface for all webview communication.
 * Direction: Application → WebView
 */
export interface WebViewMessage {
  /**
   * Message correlation ID for tracking
   */
  id: string;

  /**
   * Message type
   */
  type: WebViewMessageType;

  /**
   * Optional source ID (e.g., tool name, hook name)
   */
  sourceId?: string;

  /**
   * Message timestamp
   */
  timestamp: number;

  /**
   * Payload specific to message type
   */
  payload: WebViewMessagePayload;

  /**
   * Version for protocol compatibility
   */
  version: string;
}

/**
 * Union payload type for WebViewMessage
 */
export type WebViewMessagePayload =
  | WebViewCommand
  | StateUpdate
  | ToolEvent
  | HookEvent
  | { text: string; isStream?: boolean }
  | { message: string; level: 'info' | 'warn' | 'error' }
  | { ready?: boolean }
  | { pong: boolean }
  | Record<string, unknown>;

/**
 * WebView request interface
 * 
 * Direction: WebView → Application
 */
export interface WebViewRequest {
  /**
   * Request ID (matches response)
   */
  id: string;

  /**
   * Request type
   */
  type: WebViewRequestType;

  /**
   * Request payload
   */
  payload:unknown;

  /**
   * Request metadata
   */
  metadata?: {
    userId?: string;
    session?: string;
  };
}

/**
 * WebView request types
 */
export enum WebViewRequestType {
  ECHO = 'echo', // Pong request
  GET_STATE = 'get_state', // Retrieve state
  EXECUTE_TOOL = 'execute_tool', // Execute tool from UI
  REGISTER_HOOK = 'register_hook', // Register hook from UI
  REQUEST_MOVE_WINDOWS = 'request_move_windows', // Window management
  CHANGE_VIEW = 'change_view', // Switch UI views
  REQUEST_PERMISSION = 'request_permission', // Request user permission
  REQUEST_EMBEDDING = 'request_embedding', // Request embedding
  REQUEST_STATE = 'request_state',
}

/**
 * WebView response interface
 * 
 * Direction: Application → WebView (for WebviewRequest matching)
 */
export interface WebViewResponse {
  /**
   * Request ID to match
   */
  requestId: string;

  /**
   * Status
   */
  status: 'success' | 'error';

  /**
   * Response data
   */
  data?: unknown;

  /**
   * Error message if failed
   */
  error?: string;
}

/**
 * WebView capability flags
 */
export interface WebViewCapabilities {
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsHooks: boolean;
  supportsVisuals: boolean;
  version: string;
}

/**
 * WebView server configuration
 */
export interface WebViewServerConfig {
  /**
   * Initial view to load
   */
  initialView: 'terminal' | 'inline' | 'vscode' | 'none';

  /**
   * Enable streaming responses
   */
  enableStreaming: boolean;

  /**
   * Whether to show tool executions in UI
   */
  showTools: boolean;

  /**
   * Whether to show hook executions in UI
   */
  showHooks: boolean;

  /**
   * Maximum response size for JSON messages
   */
  maxJsonSize?: number;
}