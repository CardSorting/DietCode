/* eslint-disable */
import { 
  BooleanValue, 
  BooleanRequest, 
  Empty, 
  EmptyRequest, 
  KeyValuePair, 
  StringValue, 
  StringRequest 
} from "../common";
import { ClineMessage, ShowWebviewEvent } from "./interfaces";

/** UiService provides methods for managing UI interactions */
export type UiServiceDefinition = typeof UiServiceDefinition;
export const UiServiceDefinition = {
  name: "UiService",
  fullName: "cline.UiService",
  methods: {
    /** Scrolls to a specific settings section in the settings view */
    scrollToSettings: {
      name: "scrollToSettings",
      requestType: StringRequest,
      requestStream: false,
      responseType: KeyValuePair,
      responseStream: false,
      options: {},
    },
    /** Sets the terminal execution mode (vscodeTerminal or backgroundExec) */
    setTerminalExecutionMode: {
      name: "setTerminalExecutionMode",
      requestType: BooleanRequest,
      requestStream: false,
      responseType: KeyValuePair,
      responseStream: false,
      options: {},
    },
    /** Marks the current announcement as shown and returns whether an announcement should still be shown */
    onDidShowAnnouncement: {
      name: "onDidShowAnnouncement",
      requestType: EmptyRequest,
      requestStream: false,
      responseType: BooleanValue,
      responseStream: false,
      options: {},
    },
    /** Subscribe to addToInput events (when user adds content via context menu) */
    subscribeToAddToInput: {
      name: "subscribeToAddToInput",
      requestType: EmptyRequest,
      requestStream: false,
      responseType: StringValue,
      responseStream: true,
      options: {},
    },
    /** Subscribe to MCP button clicked events */
    subscribeToMcpButtonClicked: {
      name: "subscribeToMcpButtonClicked",
      requestType: EmptyRequest,
      requestStream: false,
      responseType: Empty,
      responseStream: true,
      options: {},
    },
    /** Subscribe to history button click events */
    subscribeToHistoryButtonClicked: {
      name: "subscribeToHistoryButtonClicked",
      requestType: EmptyRequest,
      requestStream: false,
      responseType: Empty,
      responseStream: true,
      options: {},
    },
    /** Subscribe to chat button clicked events (when the chat button is clicked in VSCode) */
    subscribeToChatButtonClicked: {
      name: "subscribeToChatButtonClicked",
      requestType: EmptyRequest,
      requestStream: false,
      responseType: Empty,
      responseStream: true,
      options: {},
    },
    /** Subscribe to account button click events */
    subscribeToAccountButtonClicked: {
      name: "subscribeToAccountButtonClicked",
      requestType: EmptyRequest,
      requestStream: false,
      responseType: Empty,
      responseStream: true,
      options: {},
    },
    /** Subscribe to settings button clicked events */
    subscribeToSettingsButtonClicked: {
      name: "subscribeToSettingsButtonClicked",
      requestType: EmptyRequest,
      requestStream: false,
      responseType: Empty,
      responseStream: true,
      options: {},
    },
    /** Subscribe to worktrees button clicked events */
    subscribeToWorktreesButtonClicked: {
      name: "subscribeToWorktreesButtonClicked",
      requestType: EmptyRequest,
      requestStream: false,
      responseType: Empty,
      responseStream: true,
      options: {},
    },
    /** Subscribe to partial message updates (streaming Cline messages as they're built) */
    subscribeToPartialMessage: {
      name: "subscribeToPartialMessage",
      requestType: EmptyRequest,
      requestStream: false,
      responseType: ClineMessage,
      responseStream: true,
      options: {},
    },
    /** Initialize webview when it launches */
    initializeWebview: {
      name: "initializeWebview",
      requestType: EmptyRequest,
      requestStream: false,
      responseType: Empty,
      responseStream: false,
      options: {},
    },
    /** Subscribe to relinquish control events */
    subscribeToRelinquishControl: {
      name: "subscribeToRelinquishControl",
      requestType: EmptyRequest,
      requestStream: false,
      responseType: Empty,
      responseStream: true,
      options: {},
    },
    /** Subscribe to show webview events */
    subscribeToShowWebview: {
      name: "subscribeToShowWebview",
      requestType: EmptyRequest,
      requestStream: false,
      responseType: ShowWebviewEvent,
      responseStream: true,
      options: {},
    },
    /** Returns the HTML for the webview index page. This is only used by external clients, not by the vscode webview. */
    getWebviewHtml: {
      name: "getWebviewHtml",
      requestType: EmptyRequest,
      requestStream: false,
      responseType: StringValue,
      responseStream: false,
      options: {},
    },
    /** Opens a URL in the default browser */
    openUrl: {
      name: "openUrl",
      requestType: StringRequest,
      requestStream: false,
      responseType: Empty,
      responseStream: false,
      options: {},
    },
    /** Opens the Cline walkthrough */
    openWalkthrough: {
      name: "openWalkthrough",
      requestType: EmptyRequest,
      requestStream: false,
      responseType: Empty,
      responseStream: false,
      options: {},
    },
  },
} as const;
