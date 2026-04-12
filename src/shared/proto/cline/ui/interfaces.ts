/* eslint-disable */
import type { 
  ClineMessageType, 
  ClineAsk, 
  ClineSay, 
  ClineSayToolType, 
  BrowserAction, 
  McpServerRequestType, 
  ClineApiReqCancelReason 
} from "./enums";

/** Message for conversation history deleted range */
export interface ConversationHistoryDeletedRange {
  startIndex: number;
  endIndex: number;
}
export const ConversationHistoryDeletedRange = {};

/** Message for ClineSayTool */
export interface ClineSayTool {
  tool: ClineSayToolType;
  path: string;
  diff: string;
  content: string;
  regex: string;
  filePattern: string;
  operationIsLocatedInWorkspace: boolean;
}
export const ClineSayTool = {};

/** Message for ClineSayBrowserAction */
export interface ClineSayBrowserAction {
  action: BrowserAction;
  coordinate: string;
  text: string;
}
export const ClineSayBrowserAction = {};

/** Message for BrowserActionResult */
export interface BrowserActionResult {
  screenshot: string;
  logs: string;
  currentUrl: string;
  currentMousePosition: string;
}
export const BrowserActionResult = {};

/** Message for ClineAskUseMcpServer */
export interface ClineAskUseMcpServer {
  serverName: string;
  type: McpServerRequestType;
  toolName: string;
  arguments: string;
  uri: string;
}
export const ClineAskUseMcpServer = {};

/** Message for ClinePlanModeResponse */
export interface ClinePlanModeResponse {
  response: string;
  options: string[];
  selected: string;
}
export const ClinePlanModeResponse = {};

/** Message for ClineAskQuestion */
export interface ClineAskQuestion {
  question: string;
  options: string[];
  selected: string;
}
export const ClineAskQuestion = {};

/** Message for ClineAskNewTask */
export interface ClineAskNewTask {
  context: string;
}
export const ClineAskNewTask = {};

/** Message for API request retry status */
export interface ApiReqRetryStatus {
  attempt: number;
  maxAttempts: number;
  delaySec: number;
  errorSnippet: string;
}
export const ApiReqRetryStatus = {};

/** Message for ClineApiReqInfo */
export interface ClineApiReqInfo {
  request: string;
  tokensIn: number;
  tokensOut: number;
  cacheWrites: number;
  cacheReads: number;
  cost: number;
  cancelReason: ClineApiReqCancelReason;
  streamingFailedMessage: string;
  retryStatus: ApiReqRetryStatus | undefined;
}
export const ClineApiReqInfo = {};

export interface ClineModelInfo {
  providerId: string;
  modelId: string;
}
export const ClineModelInfo = {};

/** Main ClineMessage type */
export interface ClineMessage {
  ts: number;
  type: ClineMessageType;
  ask: ClineAsk;
  say: ClineSay;
  text: string;
  reasoning: string;
  images: string[];
  files: string[];
  partial: boolean;
  lastCheckpointHash: string;
  isCheckpointCheckedOut: boolean;
  isOperationOutsideWorkspace: boolean;
  conversationHistoryIndex: number;
  conversationHistoryDeletedRange: ConversationHistoryDeletedRange | undefined;
  /** Additional fields for specific ask/say types */
  sayTool: ClineSayTool | undefined;
  sayBrowserAction: ClineSayBrowserAction | undefined;
  browserActionResult: BrowserActionResult | undefined;
  askUseMcpServer: ClineAskUseMcpServer | undefined;
  planModeResponse: ClinePlanModeResponse | undefined;
  askQuestion: ClineAskQuestion | undefined;
  askNewTask: ClineAskNewTask | undefined;
  apiReqInfo: ClineApiReqInfo | undefined;
  modelInfo: ClineModelInfo | undefined;
}
/** 
 * Placeholder object for ClineMessage to satisfy runtime references 
 */
export const ClineMessage = {};

export interface ShowWebviewEvent {
  /** When true, webview should not steal focus from editor */
  preserveEditorFocus: boolean;
}
/** 
 * Placeholder object for ShowWebviewEvent to satisfy runtime references 
 */
export const ShowWebviewEvent = {};
