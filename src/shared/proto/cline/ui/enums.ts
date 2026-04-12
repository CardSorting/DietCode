/* eslint-disable */

/** Enum for ClineMessage type */
export enum ClineMessageType {
  ASK = 0,
  SAY = 1,
  UNRECOGNIZED = -1,
}

export function clineMessageTypeFromJSON(object: unknown): ClineMessageType {
  switch (object) {
    case 0:
    case "ASK":
      return ClineMessageType.ASK;
    case 1:
    case "SAY":
      return ClineMessageType.SAY;
    default:
      return ClineMessageType.UNRECOGNIZED;
  }
}

export function clineMessageTypeToJSON(object: ClineMessageType): string {
  switch (object) {
    case ClineMessageType.ASK:
      return "ASK";
    case ClineMessageType.SAY:
      return "SAY";
    default:
      return "UNRECOGNIZED";
  }
}

/** Enum for ClineAsk types */
export enum ClineAsk {
  FOLLOWUP = 0,
  PLAN_MODE_RESPOND = 1,
  COMMAND = 2,
  COMMAND_OUTPUT = 3,
  COMPLETION_RESULT = 4,
  TOOL = 5,
  API_REQ_FAILED = 6,
  RESUME_TASK = 7,
  RESUME_COMPLETED_TASK = 8,
  MISTAKE_LIMIT_REACHED = 9,
  BROWSER_ACTION_LAUNCH = 10,
  USE_MCP_SERVER = 11,
  NEW_TASK = 12,
  CONDENSE = 13,
  REPORT_BUG = 14,
  SUMMARIZE_TASK = 15,
  ACT_MODE_RESPOND = 16,
  USE_SUBAGENTS = 17,
  ASK_QUESTION = 18,
  PLAN_MODE_RESPONSE = 19,
  FEATURE_TIP = 20,
  UNRECOGNIZED = -1,
}

export function clineAskFromJSON(object: unknown): ClineAsk {
  switch (object) {
    case 0:
    case "FOLLOWUP":
      return ClineAsk.FOLLOWUP;
    case 1:
    case "PLAN_MODE_RESPOND":
      return ClineAsk.PLAN_MODE_RESPOND;
    case 2:
    case "COMMAND":
      return ClineAsk.COMMAND;
    case 3:
    case "COMMAND_OUTPUT":
      return ClineAsk.COMMAND_OUTPUT;
    case 4:
    case "COMPLETION_RESULT":
      return ClineAsk.COMPLETION_RESULT;
    case 5:
    case "TOOL":
      return ClineAsk.TOOL;
    case 6:
    case "API_REQ_FAILED":
      return ClineAsk.API_REQ_FAILED;
    case 7:
    case "RESUME_TASK":
      return ClineAsk.RESUME_TASK;
    case 8:
    case "RESUME_COMPLETED_TASK":
      return ClineAsk.RESUME_COMPLETED_TASK;
    case 9:
    case "MISTAKE_LIMIT_REACHED":
      return ClineAsk.MISTAKE_LIMIT_REACHED;
    case 10:
    case "BROWSER_ACTION_LAUNCH":
      return ClineAsk.BROWSER_ACTION_LAUNCH;
    case 11:
    case "USE_MCP_SERVER":
      return ClineAsk.USE_MCP_SERVER;
    case 12:
    case "NEW_TASK":
      return ClineAsk.NEW_TASK;
    case 13:
    case "CONDENSE":
      return ClineAsk.CONDENSE;
    case 14:
    case "REPORT_BUG":
      return ClineAsk.REPORT_BUG;
    case 15:
    case "SUMMARIZE_TASK":
      return ClineAsk.SUMMARIZE_TASK;
    case 16:
    case "ACT_MODE_RESPOND":
      return ClineAsk.ACT_MODE_RESPOND;
    case 17:
    case "USE_SUBAGENTS":
      return ClineAsk.USE_SUBAGENTS;
    case 18:
    case "ASK_QUESTION":
      return ClineAsk.ASK_QUESTION;
    case 19:
    case "PLAN_MODE_RESPONSE":
      return ClineAsk.PLAN_MODE_RESPONSE;
    case 20:
    case "FEATURE_TIP":
      return ClineAsk.FEATURE_TIP;
    default:
      return ClineAsk.UNRECOGNIZED;
  }
}

export function clineAskToJSON(object: ClineAsk): string {
  switch (object) {
    case ClineAsk.FOLLOWUP:
      return "FOLLOWUP";
    case ClineAsk.PLAN_MODE_RESPOND:
      return "PLAN_MODE_RESPOND";
    case ClineAsk.COMMAND:
      return "COMMAND";
    case ClineAsk.COMMAND_OUTPUT:
      return "COMMAND_OUTPUT";
    case ClineAsk.COMPLETION_RESULT:
      return "COMPLETION_RESULT";
    case ClineAsk.TOOL:
      return "TOOL";
    case ClineAsk.API_REQ_FAILED:
      return "API_REQ_FAILED";
    case ClineAsk.RESUME_TASK:
      return "RESUME_TASK";
    case ClineAsk.RESUME_COMPLETED_TASK:
      return "RESUME_COMPLETED_TASK";
    case ClineAsk.MISTAKE_LIMIT_REACHED:
      return "MISTAKE_LIMIT_REACHED";
    case ClineAsk.BROWSER_ACTION_LAUNCH:
      return "BROWSER_ACTION_LAUNCH";
    case ClineAsk.USE_MCP_SERVER:
      return "USE_MCP_SERVER";
    case ClineAsk.NEW_TASK:
      return "NEW_TASK";
    case ClineAsk.CONDENSE:
      return "CONDENSE";
    case ClineAsk.REPORT_BUG:
      return "REPORT_BUG";
    case ClineAsk.SUMMARIZE_TASK:
      return "SUMMARIZE_TASK";
    case ClineAsk.ACT_MODE_RESPOND:
      return "ACT_MODE_RESPOND";
    case ClineAsk.USE_SUBAGENTS:
      return "USE_SUBAGENTS";
    case ClineAsk.ASK_QUESTION:
      return "ASK_QUESTION";
    case ClineAsk.PLAN_MODE_RESPONSE:
      return "PLAN_MODE_RESPONSE";
    case ClineAsk.FEATURE_TIP:
      return "FEATURE_TIP";
    default:
      return "UNRECOGNIZED";
  }
}

/** Enum for ClineSay types */
export enum ClineSay {
  TASK = 0,
  ERROR = 1,
  API_REQ_STARTED = 2,
  API_REQ_FINISHED = 3,
  TEXT = 4,
  REASONING = 5,
  COMPLETION_RESULT_SAY = 6,
  USER_FEEDBACK = 7,
  USER_FEEDBACK_DIFF = 8,
  API_REQ_RETRIED = 9,
  COMMAND_SAY = 10,
  COMMAND_OUTPUT_SAY = 11,
  TOOL_SAY = 12,
  SHELL_INTEGRATION_WARNING = 13,
  BROWSER_ACTION_LAUNCH_SAY = 14,
  BROWSER_ACTION = 15,
  BROWSER_ACTION_RESULT = 16,
  MCP_SERVER_REQUEST_STARTED = 17,
  MCP_SERVER_RESPONSE = 18,
  MCP_NOTIFICATION = 19,
  USE_MCP_SERVER_SAY = 20,
  DIFF_ERROR = 21,
  DELETED_API_REQS = 22,
  CLINEIGNORE_ERROR = 23,
  CHECKPOINT_CREATED = 24,
  LOAD_MCP_DOCUMENTATION = 25,
  INFO = 26,
  TASK_PROGRESS = 27,
  ERROR_RETRY = 28,
  GENERATE_EXPLANATION = 29,
  HOOK_STATUS = 30,
  HOOK_OUTPUT_STREAM = 31,
  COMMAND_PERMISSION_DENIED = 32,
  CONDITIONAL_RULES_APPLIED = 33,
  SUBAGENT_STATUS = 34,
  USE_SUBAGENTS_SAY = 35,
  SUBAGENT_USAGE = 36,
  UNRECOGNIZED = -1,
}

export function clineSayFromJSON(object: unknown): ClineSay {
  switch (object) {
    case 0:
    case "TASK":
      return ClineSay.TASK;
    case 1:
    case "ERROR":
      return ClineSay.ERROR;
    case 2:
    case "API_REQ_STARTED":
      return ClineSay.API_REQ_STARTED;
    case 3:
    case "API_REQ_FINISHED":
      return ClineSay.API_REQ_FINISHED;
    case 4:
    case "TEXT":
      return ClineSay.TEXT;
    case 5:
    case "REASONING":
      return ClineSay.REASONING;
    case 6:
    case "COMPLETION_RESULT_SAY":
      return ClineSay.COMPLETION_RESULT_SAY;
    case 7:
    case "USER_FEEDBACK":
      return ClineSay.USER_FEEDBACK;
    case 8:
    case "USER_FEEDBACK_DIFF":
      return ClineSay.USER_FEEDBACK_DIFF;
    case 9:
    case "API_REQ_RETRIED":
      return ClineSay.API_REQ_RETRIED;
    case 10:
    case "COMMAND_SAY":
      return ClineSay.COMMAND_SAY;
    case 11:
    case "COMMAND_OUTPUT_SAY":
      return ClineSay.COMMAND_OUTPUT_SAY;
    case 12:
    case "TOOL_SAY":
      return ClineSay.TOOL_SAY;
    case 13:
    case "SHELL_INTEGRATION_WARNING":
      return ClineSay.SHELL_INTEGRATION_WARNING;
    case 14:
    case "BROWSER_ACTION_LAUNCH_SAY":
      return ClineSay.BROWSER_ACTION_LAUNCH_SAY;
    case 15:
    case "BROWSER_ACTION":
      return ClineSay.BROWSER_ACTION;
    case 16:
    case "BROWSER_ACTION_RESULT":
      return ClineSay.BROWSER_ACTION_RESULT;
    case 17:
    case "MCP_SERVER_REQUEST_STARTED":
      return ClineSay.MCP_SERVER_REQUEST_STARTED;
    case 18:
    case "MCP_SERVER_RESPONSE":
      return ClineSay.MCP_SERVER_RESPONSE;
    case 19:
    case "MCP_NOTIFICATION":
      return ClineSay.MCP_NOTIFICATION;
    case 20:
    case "USE_MCP_SERVER_SAY":
      return ClineSay.USE_MCP_SERVER_SAY;
    case 21:
    case "DIFF_ERROR":
      return ClineSay.DIFF_ERROR;
    case 22:
    case "DELETED_API_REQS":
      return ClineSay.DELETED_API_REQS;
    case 23:
    case "CLINEIGNORE_ERROR":
      return ClineSay.CLINEIGNORE_ERROR;
    case 24:
    case "CHECKPOINT_CREATED":
      return ClineSay.CHECKPOINT_CREATED;
    case 25:
    case "LOAD_MCP_DOCUMENTATION":
      return ClineSay.LOAD_MCP_DOCUMENTATION;
    case 26:
    case "INFO":
      return ClineSay.INFO;
    case 27:
    case "TASK_PROGRESS":
      return ClineSay.TASK_PROGRESS;
    case 28:
    case "ERROR_RETRY":
      return ClineSay.ERROR_RETRY;
    case 29:
    case "GENERATE_EXPLANATION":
      return ClineSay.GENERATE_EXPLANATION;
    case 30:
    case "HOOK_STATUS":
      return ClineSay.HOOK_STATUS;
    case 31:
    case "HOOK_OUTPUT_STREAM":
      return ClineSay.HOOK_OUTPUT_STREAM;
    case 32:
    case "COMMAND_PERMISSION_DENIED":
      return ClineSay.COMMAND_PERMISSION_DENIED;
    case 33:
    case "CONDITIONAL_RULES_APPLIED":
      return ClineSay.CONDITIONAL_RULES_APPLIED;
    case 34:
    case "SUBAGENT_STATUS":
      return ClineSay.SUBAGENT_STATUS;
    case 35:
    case "USE_SUBAGENTS_SAY":
      return ClineSay.USE_SUBAGENTS_SAY;
    case 36:
    case "SUBAGENT_USAGE":
      return ClineSay.SUBAGENT_USAGE;
    default:
      return ClineSay.UNRECOGNIZED;
  }
}

export function clineSayToJSON(object: ClineSay): string {
  switch (object) {
    case ClineSay.TASK:
      return "TASK";
    case ClineSay.ERROR:
      return "ERROR";
    case ClineSay.API_REQ_STARTED:
      return "API_REQ_STARTED";
    case ClineSay.API_REQ_FINISHED:
      return "API_REQ_FINISHED";
    case ClineSay.TEXT:
      return "TEXT";
    case ClineSay.REASONING:
      return "REASONING";
    case ClineSay.COMPLETION_RESULT_SAY:
      return "COMPLETION_RESULT_SAY";
    case ClineSay.USER_FEEDBACK:
      return "USER_FEEDBACK";
    case ClineSay.USER_FEEDBACK_DIFF:
      return "USER_FEEDBACK_DIFF";
    case ClineSay.API_REQ_RETRIED:
      return "API_REQ_RETRIED";
    case ClineSay.COMMAND_SAY:
      return "COMMAND_SAY";
    case ClineSay.COMMAND_OUTPUT_SAY:
      return "COMMAND_OUTPUT_SAY";
    case ClineSay.TOOL_SAY:
      return "TOOL_SAY";
    case ClineSay.SHELL_INTEGRATION_WARNING:
      return "SHELL_INTEGRATION_WARNING";
    case ClineSay.BROWSER_ACTION_LAUNCH_SAY:
      return "BROWSER_ACTION_LAUNCH_SAY";
    case ClineSay.BROWSER_ACTION:
      return "BROWSER_ACTION";
    case ClineSay.BROWSER_ACTION_RESULT:
      return "BROWSER_ACTION_RESULT";
    case ClineSay.MCP_SERVER_REQUEST_STARTED:
      return "MCP_SERVER_REQUEST_STARTED";
    case ClineSay.MCP_SERVER_RESPONSE:
      return "MCP_SERVER_RESPONSE";
    case ClineSay.MCP_NOTIFICATION:
      return "MCP_NOTIFICATION";
    case ClineSay.USE_MCP_SERVER_SAY:
      return "USE_MCP_SERVER_SAY";
    case ClineSay.DIFF_ERROR:
      return "DIFF_ERROR";
    case ClineSay.DELETED_API_REQS:
      return "DELETED_API_REQS";
    case ClineSay.CLINEIGNORE_ERROR:
      return "CLINEIGNORE_ERROR";
    case ClineSay.CHECKPOINT_CREATED:
      return "CHECKPOINT_CREATED";
    case ClineSay.LOAD_MCP_DOCUMENTATION:
      return "LOAD_MCP_DOCUMENTATION";
    case ClineSay.INFO:
      return "INFO";
    case ClineSay.TASK_PROGRESS:
      return "TASK_PROGRESS";
    case ClineSay.ERROR_RETRY:
      return "ERROR_RETRY";
    case ClineSay.GENERATE_EXPLANATION:
      return "GENERATE_EXPLANATION";
    case ClineSay.HOOK_STATUS:
      return "HOOK_STATUS";
    case ClineSay.HOOK_OUTPUT_STREAM:
      return "HOOK_OUTPUT_STREAM";
    case ClineSay.COMMAND_PERMISSION_DENIED:
      return "COMMAND_PERMISSION_DENIED";
    case ClineSay.CONDITIONAL_RULES_APPLIED:
      return "CONDITIONAL_RULES_APPLIED";
    case ClineSay.SUBAGENT_STATUS:
      return "SUBAGENT_STATUS";
    case ClineSay.USE_SUBAGENTS_SAY:
      return "USE_SUBAGENTS_SAY";
    case ClineSay.SUBAGENT_USAGE:
      return "SUBAGENT_USAGE";
    default:
      return "UNRECOGNIZED";
  }
}

/** Enum for ClineSayTool tool types */
export enum ClineSayToolType {
  EDITED_EXISTING_FILE = 0,
  NEW_FILE_CREATED = 1,
  READ_FILE = 2,
  LIST_FILES_TOP_LEVEL = 3,
  LIST_FILES_RECURSIVE = 4,
  LIST_CODE_DEFINITION_NAMES = 5,
  SEARCH_FILES = 6,
  WEB_FETCH = 7,
  FILE_DELETED = 8,
  UNRECOGNIZED = -1,
}

export function clineSayToolTypeFromJSON(object: unknown): ClineSayToolType {
  switch (object) {
    case 0:
    case "EDITED_EXISTING_FILE":
      return ClineSayToolType.EDITED_EXISTING_FILE;
    case 1:
    case "NEW_FILE_CREATED":
      return ClineSayToolType.NEW_FILE_CREATED;
    case 2:
    case "READ_FILE":
      return ClineSayToolType.READ_FILE;
    case 3:
    case "LIST_FILES_TOP_LEVEL":
      return ClineSayToolType.LIST_FILES_TOP_LEVEL;
    case 4:
    case "LIST_FILES_RECURSIVE":
      return ClineSayToolType.LIST_FILES_RECURSIVE;
    case 5:
    case "LIST_CODE_DEFINITION_NAMES":
      return ClineSayToolType.LIST_CODE_DEFINITION_NAMES;
    case 6:
    case "SEARCH_FILES":
      return ClineSayToolType.SEARCH_FILES;
    case 7:
    case "WEB_FETCH":
      return ClineSayToolType.WEB_FETCH;
    case 8:
    case "FILE_DELETED":
      return ClineSayToolType.FILE_DELETED;
    default:
      return ClineSayToolType.UNRECOGNIZED;
  }
}

export function clineSayToolTypeToJSON(object: ClineSayToolType): string {
  switch (object) {
    case ClineSayToolType.EDITED_EXISTING_FILE:
      return "EDITED_EXISTING_FILE";
    case ClineSayToolType.NEW_FILE_CREATED:
      return "NEW_FILE_CREATED";
    case ClineSayToolType.READ_FILE:
      return "READ_FILE";
    case ClineSayToolType.LIST_FILES_TOP_LEVEL:
      return "LIST_FILES_TOP_LEVEL";
    case ClineSayToolType.LIST_FILES_RECURSIVE:
      return "LIST_FILES_RECURSIVE";
    case ClineSayToolType.LIST_CODE_DEFINITION_NAMES:
      return "LIST_CODE_DEFINITION_NAMES";
    case ClineSayToolType.SEARCH_FILES:
      return "SEARCH_FILES";
    case ClineSayToolType.WEB_FETCH:
      return "WEB_FETCH";
    case ClineSayToolType.FILE_DELETED:
      return "FILE_DELETED";
    default:
      return "UNRECOGNIZED";
  }
}

/** Enum for browser actions */
export enum BrowserAction {
  LAUNCH = 0,
  CLICK = 1,
  TYPE = 2,
  SCROLL_DOWN = 3,
  SCROLL_UP = 4,
  CLOSE = 5,
  UNRECOGNIZED = -1,
}

export function browserActionFromJSON(object: unknown): BrowserAction {
  switch (object) {
    case 0:
    case "LAUNCH":
      return BrowserAction.LAUNCH;
    case 1:
    case "CLICK":
      return BrowserAction.CLICK;
    case 2:
    case "TYPE":
      return BrowserAction.TYPE;
    case 3:
    case "SCROLL_DOWN":
      return BrowserAction.SCROLL_DOWN;
    case 4:
    case "SCROLL_UP":
      return BrowserAction.SCROLL_UP;
    case 5:
    case "CLOSE":
      return BrowserAction.CLOSE;
    default:
      return BrowserAction.UNRECOGNIZED;
  }
}

export function browserActionToJSON(object: BrowserAction): string {
  switch (object) {
    case BrowserAction.LAUNCH:
      return "LAUNCH";
    case BrowserAction.CLICK:
      return "CLICK";
    case BrowserAction.TYPE:
      return "TYPE";
    case BrowserAction.SCROLL_DOWN:
      return "SCROLL_DOWN";
    case BrowserAction.SCROLL_UP:
      return "SCROLL_UP";
    case BrowserAction.CLOSE:
      return "CLOSE";
    default:
      return "UNRECOGNIZED";
  }
}

/** Enum for MCP server request types */
export enum McpServerRequestType {
  USE_MCP_TOOL = 0,
  ACCESS_MCP_RESOURCE = 1,
  UNRECOGNIZED = -1,
}

export function mcpServerRequestTypeFromJSON(object: unknown): McpServerRequestType {
  switch (object) {
    case 0:
    case "USE_MCP_TOOL":
      return McpServerRequestType.USE_MCP_TOOL;
    case 1:
    case "ACCESS_MCP_RESOURCE":
      return McpServerRequestType.ACCESS_MCP_RESOURCE;
    default:
      return McpServerRequestType.UNRECOGNIZED;
  }
}

export function mcpServerRequestTypeToJSON(object: McpServerRequestType): string {
  switch (object) {
    case McpServerRequestType.USE_MCP_TOOL:
      return "USE_MCP_TOOL";
    case McpServerRequestType.ACCESS_MCP_RESOURCE:
      return "ACCESS_MCP_RESOURCE";
    default:
      return "UNRECOGNIZED";
  }
}

/** Enum for API request cancel reasons */
export enum ClineApiReqCancelReason {
  STREAMING_FAILED = 0,
  USER_CANCELLED = 1,
  RETRIES_EXHAUSTED = 2,
  UNRECOGNIZED = -1,
}

export function clineApiReqCancelReasonFromJSON(object: unknown): ClineApiReqCancelReason {
  switch (object) {
    case 0:
    case "STREAMING_FAILED":
      return ClineApiReqCancelReason.STREAMING_FAILED;
    case 1:
    case "USER_CANCELLED":
      return ClineApiReqCancelReason.USER_CANCELLED;
    case 2:
    case "RETRIES_EXHAUSTED":
      return ClineApiReqCancelReason.RETRIES_EXHAUSTED;
    default:
      return ClineApiReqCancelReason.UNRECOGNIZED;
  }
}

export function clineApiReqCancelReasonToJSON(object: ClineApiReqCancelReason): string {
  switch (object) {
    case ClineApiReqCancelReason.STREAMING_FAILED:
      return "STREAMING_FAILED";
    case ClineApiReqCancelReason.USER_CANCELLED:
      return "USER_CANCELLED";
    case ClineApiReqCancelReason.RETRIES_EXHAUSTED:
      return "RETRIES_EXHAUSTED";
    default:
      return "UNRECOGNIZED";
  }
}
