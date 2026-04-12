// type that represents json data that is sent from extension to webview, called ExtensionMessage and has 'type' enum which can be 'plusButtonClicked' or 'settingsButtonClicked' or 'hello'

import type { WorkspaceRoot } from "@shared/multi-root/types";
import type { RemoteConfigFields } from "@shared/storage/state-keys";
import type { Environment } from "./config-types";
import type { AutoApprovalSettings } from "./AutoApprovalSettings";
import type { BrowserSettings } from "./BrowserSettings";
import type { SovereignFeatureSetting } from "./SovereignFeatureSetting";
import type { FocusChainSettings } from "./FocusChainSettings";
import type { HistoryItem } from "./HistoryItem";
import type { McpDisplayMode } from "./McpDisplayMode";
import type { McpServer, McpMarketplaceCatalog, McpTool, McpResource, McpResourceTemplate } from "./mcp";
import type { UserInfo } from "./nice-grpc/cline/account";
export type { McpServer, McpMarketplaceCatalog, McpTool, McpResource, McpResourceTemplate, UserInfo };

export type { RemoteConfigFields } from "./storage/state-keys";
import type { ApiConfiguration, ModelInfo } from "./api";
import type { SovereignRulesToggles } from "./cline-rules";
import type { SovereignMessageModelInfo } from "./messages";
import type { Mode } from "./storage/types";
import type { TelemetrySetting } from "./TelemetrySetting";

export type { TelemetrySetting };


export type ClineRulesToggles = SovereignRulesToggles;
export type ClineAsk = SovereignAsk;
export type ClineSay = SovereignSay;

// webview will hold state
export interface ExtensionMessage {
  type: "grpc_response"; // New type for gRPC responses
  grpc_response?: GrpcResponse;
}

export type GrpcResponse = {
  message?: unknown; // JSON serialized protobuf message
  request_id: string; // Same ID as the request
  error?: string; // Optional error message
  is_streaming?: boolean; // Whether this is part of a streaming response
  sequence_number?: number; // For ordering chunks in streaming responses
};

export type Platform =
  | "aix"
  | "darwin"
  | "freebsd"
  | "linux"
  | "openbsd"
  | "sunos"
  | "win32"
  | "unknown";

export const DEFAULT_PLATFORM = "unknown";

export const COMMAND_CANCEL_TOKEN = "__sovereign_command_cancel__";
export interface ExtensionState {
  isNewUser: boolean;
  welcomeViewCompleted: boolean;
  apiConfiguration?: ApiConfiguration;
  autoApprovalSettings: AutoApprovalSettings;
  browserSettings: BrowserSettings;
  remoteBrowserHost?: string;
  preferredLanguage?: string;
  mode: Mode;
  checkpointManagerErrorMessage?: string;
  messages: SovereignMessage[];
  clineMessages: ClineMessage[]; // Alias for messages
  currentTaskItem?: HistoryItem;

  currentFocusChainChecklist?: string | null;
  mcpMarketplaceEnabled?: boolean;
  mcpDisplayMode: McpDisplayMode;
  planActSeparateModelsSetting: boolean;
  enableCheckpointsSetting?: boolean;
  platform: Platform;
  environment?: Environment;
  shouldShowAnnouncement: boolean;
  taskHistory: HistoryItem[];
  telemetrySetting: TelemetrySetting;
  shellIntegrationTimeout: number;
  terminalReuseEnabled?: boolean;
  terminalOutputLineLimit: number;
  maxConsecutiveMistakes: number;
  defaultTerminalProfile?: string;
  vscodeTerminalExecutionMode: string;
  backgroundCommandRunning?: boolean;
  backgroundCommandTaskId?: string;
  lastCompletedCommandTs?: number;
  version: string;
  distinctId: string;
  globalRulesToggles: SovereignRulesToggles;
  localRulesToggles: SovereignRulesToggles;
  localWorkflowToggles: SovereignRulesToggles;
  globalWorkflowToggles: SovereignRulesToggles;
  localCursorRulesToggles: SovereignRulesToggles;
  localWindsurfRulesToggles: SovereignRulesToggles;
  remoteRulesToggles?: SovereignRulesToggles;
  remoteWorkflowToggles?: SovereignRulesToggles;
  globalAgentsRulesToggles?: SovereignRulesToggles;
  localAgentsRulesToggles?: SovereignRulesToggles;
  mcpResponsesCollapsed?: boolean;
  strictPlanModeEnabled?: boolean;
  yoloModeToggled?: boolean;
  useAutoCondense?: boolean;
  subagentsEnabled?: boolean;
  webToolsEnabled?: SovereignFeatureSetting;
  worktreesEnabled?: SovereignFeatureSetting;
  focusChainSettings: FocusChainSettings;
  customPrompt?: string;
  workspaceRoots: WorkspaceRoot[];
  primaryRootIndex: number;
  isMultiRootWorkspace: boolean;
  multiRootSetting: SovereignFeatureSetting;
  hooksEnabled?: boolean;
  remoteConfigSettings?: Partial<RemoteConfigFields>;
  remoteGlobalSkillsToggles?: Record<string, boolean>;
  localSkillsToggles?: Record<string, boolean>;
  nativeToolCallSetting?: boolean;
  enableParallelToolCalling?: boolean;
  backgroundEditEnabled?: boolean;
  optOutOfRemoteConfig?: boolean;
  doubleCheckCompletionEnabled?: boolean;
  lazyTeammateModeEnabled?: boolean;
  showFeatureTips?: boolean;
  mcpServers?: McpServer[];
  lastDismissedInfoBannerVersion: number;
  lastDismissedModelBannerVersion: number;
  lastDismissedCliBannerVersion: number;
  dismissedBanners?: string[]; 
  banners?: BannerCardData[];
  welcomeBanners?: BannerCardData[];
  availableProviderModels?: Record<string, Record<string, ModelInfo>>;


  providerHealth?: Record<string, { status: "healthy" | "unhealthy" | "degraded"; message?: string }>;
  favoritedModelIds?: string[];
  taskHistorySummary?: unknown[];
  settingsInitialModelTab?: "recommended" | "free";
  globalSkillsToggles?: Record<string, boolean>;
  userInfo?: UserInfo;
  onboardingModels?: unknown;
}


export enum BannerActionType {
  OpenUrl = "open_url",
  Dismiss = "dismiss",
  NavigateTab = "navigate_tab",
  ExecuteCommand = "execute_command",
}


export interface BannerAction {
  title?: string;
  action?: BannerActionType | string;
  arg?: string;
}

export interface BannerRules {
  providers?: string[];
  os?: Platform[];
  ide?: string[];
  version?: string;
}

export interface Banner {
  id: string;
  placement: "top" | "welcome" | "task_sidebar";
  titleMd: string;
  bodyMd?: string;
  icon?: string;
  rulesJson?: string;
  actions?: BannerAction[];
}

export interface BannersResponse {
  data: {
    items: Banner[];
  };
}

export interface BannerCardData {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  actions: {
    title: string;
    action: BannerActionType;
    arg?: string;
  }[];
}


export type ClineMessage = SovereignMessage;

export interface SovereignMessage {

  ts: number;
  type: "ask" | "say";
  ask?: SovereignAsk;
  say?: SovereignSay;
  text?: string;
  reasoning?: string;
  images?: string[];
  files?: string[];
  partial?: boolean;
  commandCompleted?: boolean;
  lastCheckpointHash?: string;
  isCheckpointCheckedOut?: boolean;
  isOperationOutsideWorkspace?: boolean;
  conversationHistoryIndex?: number;
  conversationHistoryDeletedRange?: [number, number]; // for when conversation history is truncated for API requests
  modelInfo?: SovereignMessageModelInfo;
  askQuestion?: SovereignAskQuestion;
  askNewTask?: SovereignAskNewTask;
  askUseMcpServer?: SovereignAskUseMcpServer;
  askUseSubagents?: SovereignAskUseSubagents;
  sayTool?: SovereignSayTool;
  sayBrowserAction?: SovereignSayBrowserAction;
  sayGenerateExplanation?: SovereignSayGenerateExplanation;
  sayHook?: SovereignSayHook;
  mcpServer?: McpServer;
  mcpTool?: McpTool;
  mcpResource?: McpResource | McpResourceTemplate;
}

export type SovereignAsk =
  | "followup"
  | "plan_mode_respond"
  | "act_mode_respond"
  | "command"
  | "command_output"
  | "completion_result"
  | "tool"
  | "api_req_failed"
  | "resume_task"
  | "resume_completed_task"
  | "mistake_limit_reached"
  | "browser_action_launch"
  | "use_mcp_server"
  | "new_task"
  | "condense"
  | "summarize_task"
  | "report_bug"
  | "use_subagents"
  | "ask_question"
  | "plan_mode_response"
  | "feature_tip";

export type SovereignSay =
  | "task"
  | "error"
  | "error_retry"
  | "api_req_started"
  | "api_req_finished"
  | "text"
  | "reasoning"
  | "completion_result"
  | "user_feedback"
  | "user_feedback_diff"
  | "api_req_retried"
  | "command"
  | "command_output"
  | "tool"
  | "shell_integration_warning"
  | "shell_integration_warning_with_suggestion"
  | "browser_action_launch"
  | "browser_action"
  | "browser_action_result"
  | "mcp_server_request_started"
  | "mcp_server_response"
  | "mcp_notification"
  | "use_mcp_server"
  | "diff_error"
  | "deleted_api_reqs"
  | "clineignore_error"
  | "command_permission_denied"
  | "checkpoint_created"
  | "load_mcp_documentation"
  | "generate_explanation"
  | "info" // Added for general informational messages like retry status
  | "task_progress"
  | "hook_status"
  | "hook_output_stream"
  | "subagent"
  | "use_subagents"
  | "subagent_usage"
  | "conditional_rules_applied";

export interface SovereignSayTool {
  tool:
    | "editedExistingFile"
    | "newFileCreated"
    | "fileDeleted"
    | "readFile"
    | "listFilesTopLevel"
    | "listFilesRecursive"
    | "listCodeDefinitionNames"
    | "searchFiles"
    | "webFetch"
    | "webSearch"
    | "summarizeTask"
    | "useSkill";
  path?: string;
  diff?: string;
  content?: string;
  regex?: string;
  filePattern?: string;
  operationIsLocatedInWorkspace?: boolean;
  /** Starting line numbers in the original file where each SEARCH block matched */
  startLineNumbers?: number[];
  /** Inclusive line range actually returned by read_file (for UI summaries). */
  readLineStart?: number;
  readLineEnd?: number;
}

export interface SovereignSayHook {
  hookName: string; // Name of the hook (e.g., "PreToolUse", "PostToolUse")
  toolName?: string; // Tool name if applicable (for PreToolUse/PostToolUse)
  status: "running" | "completed" | "failed" | "cancelled"; // Execution status
  exitCode?: number; // Exit code when completed
  hasJsonResponse?: boolean; // Whether a JSON response was parsed
  // Pending tool information (only present during PreToolUse "running" status)
  pendingToolInfo?: {
    tool: string; // Tool name (e.g., "write_to_file", "execute_command")
    path?: string; // File path for file operations
    command?: string; // Command for execute_command
    content?: string; // Content preview (first 200 chars)
    diff?: string; // Diff preview (first 200 chars)
    regex?: string; // Regex pattern for search_files
    url?: string; // URL for web_fetch or browser_action
    mcpTool?: string; // MCP tool name
    mcpServer?: string; // MCP server name
    resourceUri?: string; // MCP resource URI
  };
  // Structured error information (only present when status is "failed")
  error?: {
    type: "timeout" | "validation" | "execution" | "cancellation"; // Type of error
    message: string; // User-friendly error message
    details?: string; // Technical details for expansion
    scriptPath?: string; // Path to the hook script
  };
}

export type HookOutputStreamMeta = {
  /** Which hook configuration the script originated from (global vs workspace). */
  source: "global" | "workspace";
  /** Full path to the hook script that emitted the output. */
  scriptPath: string;
};

// must keep in sync with system prompt
export const browserActions = [
  "launch",
  "click",
  "type",
  "scroll_down",
  "scroll_up",
  "close",
] as const;
export type BrowserAction = (typeof browserActions)[number];

export interface SovereignSayBrowserAction {
  action: BrowserAction;
  coordinate?: string;
  text?: string;
}

export interface SovereignSayGenerateExplanation {
  title: string;
  fromRef: string;
  toRef: string;
  status: "generating" | "complete" | "error";
  error?: string;
}

export type SubagentExecutionStatus = "pending" | "running" | "completed" | "failed";

export interface SubagentStatusItem {
  index: number;
  prompt: string;
  status: SubagentExecutionStatus;
  toolCalls: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  contextTokens: number;
  contextWindow: number;
  contextUsagePercentage: number;
  latestToolCall?: string;
  result?: string;
  error?: string;
}

export interface SovereignSaySubagentStatus {
  status: "running" | "completed" | "failed";
  total: number;
  completed: number;
  successes: number;
  failures: number;
  toolCalls: number;
  inputTokens: number;
  outputTokens: number;
  contextWindow: number;
  maxContextTokens: number;
  maxContextUsagePercentage: number;
  items: SubagentStatusItem[];
}

export type BrowserActionResult = {
  screenshot?: string;
  logs?: string;
  currentUrl?: string;
  currentMousePosition?: string;
};

export interface SovereignAskUseMcpServer {
  serverName: string;
  type: "use_mcp_tool" | "access_mcp_resource";
  toolName?: string;
  arguments?: string;
  uri?: string;
}

export interface SovereignAskUseSubagents {
  prompts: string[];
}

export interface ClinePlanModeResponse {
  response: string;
  options?: string[];
  selected?: string;
}

export interface SovereignAskQuestion {
  question: string;
  options?: string[];
  selected?: string;
}

export interface SovereignAskNewTask {
  context: string;
}

export interface ClineApiReqInfo {
  request?: string;
  tokensIn?: number;
  tokensOut?: number;
  cacheWrites?: number;
  cacheReads?: number;
  cost?: number;
  cancelReason?: ClineApiReqCancelReason;
  streamingFailedMessage?: string;
  retryStatus?: {
    attempt: number;
    maxAttempts: number;
    delaySec: number;
    errorSnippet?: string;
  };
}

export interface ClineSubagentUsageInfo {
  source: "subagents";
  tokensIn: number;
  tokensOut: number;
  cacheWrites: number;
  cacheReads: number;
  cost: number;
}

export type ClineApiReqCancelReason = "streaming_failed" | "user_cancelled" | "retries_exhausted";

export const COMPLETION_RESULT_CHANGES_FLAG = "HAS_CHANGES";
