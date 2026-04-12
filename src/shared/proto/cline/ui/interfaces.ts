/* eslint-disable */
import { 
  ClineMessageType, 
  ClineAsk, 
  ClineSay, 
  ClineSayToolType, 
  BrowserAction, 
  McpServerRequestType, 
  ClineApiReqCancelReason 
} from "./enums";

import { createMsg } from "../common/index";

/** Message for conversation history deleted range */
export interface ConversationHistoryDeletedRange {
  startIndex: number;
  endIndex: number;
}
export const ConversationHistoryDeletedRange = createMsg<ConversationHistoryDeletedRange>({
  startIndex: 0,
  endIndex: 0,
});

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
export const ClineSayTool = createMsg<ClineSayTool>({
  tool: ClineSayToolType.EDITED_EXISTING_FILE,
  path: "",
  diff: "",
  content: "",
  regex: "",
  filePattern: "",
  operationIsLocatedInWorkspace: false,
});

/** Message for ClineSayBrowserAction */
export interface ClineSayBrowserAction {
  action: BrowserAction;
  coordinate: string;
  text: string;
}
export const ClineSayBrowserAction = createMsg<ClineSayBrowserAction>({
  action: BrowserAction.CLICK,
  coordinate: "",
  text: "",
});

/** Message for BrowserActionResult */
export interface BrowserActionResult {
  screenshot: string;
  logs: string;
  currentUrl: string;
  currentMousePosition: string;
}
export const BrowserActionResult = createMsg<BrowserActionResult>({
  screenshot: "",
  logs: "",
  currentUrl: "",
  currentMousePosition: "",
});

/** Message for ClineAskUseMcpServer */
export interface ClineAskUseMcpServer {
  serverName: string;
  type: McpServerRequestType;
  toolName: string;
  arguments: string;
  uri: string;
}
export const ClineAskUseMcpServer = createMsg<ClineAskUseMcpServer>({
  serverName: "",
  type: McpServerRequestType.USE_MCP_TOOL,
  toolName: "",
  arguments: "",
  uri: "",
});

/** Message for ClinePlanModeResponse */
export interface ClinePlanModeResponse {
  response: string;
  options: string[];
  selected: string;
}
export const ClinePlanModeResponse = createMsg<ClinePlanModeResponse>({
  response: "",
  options: [],
  selected: "",
});

/** Message for ClineAskQuestion */
export interface ClineAskQuestion {
  question: string;
  options: string[];
  selected: string;
}
export const ClineAskQuestion = createMsg<ClineAskQuestion>({
  question: "",
  options: [],
  selected: "",
});

/** Message for ClineAskNewTask */
export interface ClineAskNewTask {
  context: string;
}
export const ClineAskNewTask = createMsg<ClineAskNewTask>({
  context: "",
});

/** Message for API request retry status */
export interface ApiReqRetryStatus {
  attempt: number;
  maxAttempts: number;
  delaySec: number;
  errorSnippet: string;
}
export const ApiReqRetryStatus = createMsg<ApiReqRetryStatus>({
  attempt: 0,
  maxAttempts: 0,
  delaySec: 0,
  errorSnippet: "",
});

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
export const ClineApiReqInfo = createMsg<ClineApiReqInfo>({
  request: "",
  tokensIn: 0,
  tokensOut: 0,
  cacheWrites: 0,
  cacheReads: 0,
  cost: 0,
  cancelReason: ClineApiReqCancelReason.USER_CANCELLED,
  streamingFailedMessage: "",
  retryStatus: undefined,
});

export interface ClineModelInfo {
  providerId: string;
  modelId: string;
}
export const ClineModelInfo = createMsg<ClineModelInfo>({
  providerId: "",
  modelId: "",
});

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
 * Hardened object for ClineMessage to satisfy runtime references 
 */
export const ClineMessage = createMsg<ClineMessage>({
  ts: 0,
  type: ClineMessageType.SAY,
  ask: ClineAsk.NEW_TASK,
  say: ClineSay.TEXT,
  text: "",
  reasoning: "",
  images: [],
  files: [],
  partial: false,
  lastCheckpointHash: "",
  isCheckpointCheckedOut: false,
  isOperationOutsideWorkspace: false,
  conversationHistoryIndex: 0,
  conversationHistoryDeletedRange: undefined,
  sayTool: undefined,
  sayBrowserAction: undefined,
  browserActionResult: undefined,
  askUseMcpServer: undefined,
  planModeResponse: undefined,
  askQuestion: undefined,
  askNewTask: undefined,
  apiReqInfo: undefined,
  modelInfo: undefined,
});

export interface ShowWebviewEvent {
  /** When true, webview should not steal focus from editor */
  preserveEditorFocus: boolean;
}
/** 
 * Hardened object for ShowWebviewEvent to satisfy runtime references 
 */
export const ShowWebviewEvent = createMsg<ShowWebviewEvent>({
  preserveEditorFocus: false,
});
