import * as vscode from 'vscode';
/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {
  type WebViewMessage,
  WebViewMessageType,
  type WebViewRequest,
  WebViewRequestType,
  type WebViewResponse,
  type SovereignSettings,
} from '../../domain/ui/WebViewMessageProtocol';
import { Logger } from '../../shared/services/Logger';
import { UIBridge } from './UIBridge';
import { StateOrchestrator } from '../../core/manager/orchestrator';
import { StateAssembler } from '../../core/manager/StateAssembler';
import type { GlobalState } from '../../domain/LLMProvider';

import { ModelsHandler } from './handlers/ModelsHandler';
import { TaskHandler } from './handlers/TaskHandler';
import { McpHandler } from './handlers/McpHandler';
import { StateAndUiHandler } from './handlers/StateAndUiHandler';
import type { GrpcRequest, IHandler } from './handlers/types';

/**
 * [LAYER: UI / PROVIDER]
 * High-fidelity WebView provider for VS Code.
 * 
 * DESIGN: Orchestrator that delegates gRPC requests to specialized handlers
 * to maintain separation of concerns. Optimized exclusively for Gemini.
 */
export class SovereignWebViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'dietcode-webview';

  private _view?: vscode.WebviewView;
  private _bridge: UIBridge;
  private _handlers: Map<string, IHandler> = new Map();

  constructor(private readonly _context: vscode.ExtensionContext) {
    this._bridge = UIBridge.getInstance();
    this._initializeHandlers();
  }

  private _initializeHandlers() {
    const sendResponse = (reqId: string, payload: unknown, streaming = false) => 
      this._sendGrpcSuccess(reqId, payload, streaming);

    this._handlers.set('cline.ModelsService', new ModelsHandler(this._context, sendResponse));
    this._handlers.set('cline.TaskService', new TaskHandler(sendResponse));
    this._handlers.set('cline.McpService', new McpHandler(sendResponse));
    
    const sharedHandler = new StateAndUiHandler(this._context, sendResponse);
    this._handlers.set('cline.StateService', sharedHandler);
    this._handlers.set('cline.UiService', sharedHandler);
    this._handlers.set('cline.AccountService', sharedHandler);
  }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message: WebViewRequest) => {
      try {
        await this._handleMessage(message);
      } catch (error) {
        Logger.error('[WEBVIEW] Message handling error:', error);
      }
    });

    // Stream initial state
    const state = await StateAssembler.getInstance().assemble();
    this._post(WebViewMessageType.STATE_UPDATE, state);
  }

  private async _handleMessage(message: WebViewRequest) {
    switch (message.type) {
      case WebViewRequestType.GRPC_REQUEST:
        await this._handleGrpcRequest(message.payload as GrpcRequest);
        break;
      case WebViewRequestType.SAVE_SETTINGS:
        await this._saveSettings(message.payload as SovereignSettings);
        break;
      default:
        Logger.warn(`[WEBVIEW] Unhandled message type: ${message.type}`);
    }
  }

  private async _handleGrpcRequest(request: GrpcRequest) {
    const handler = this._handlers.get(request.service);
    if (handler) {
      await handler.handle(request.method, request);
    } else {
      Logger.warn(`[WEBVIEW] No handler registered for service: ${request.service}`);
      this._sendGrpcSuccess(request.request_id, {});
    }
  }

  private _sendGrpcSuccess(request_id: string, payload: unknown, is_streaming = false) {
    this._post(WebViewMessageType.GRPC_RESPONSE, {
      request_id,
      success: true,
      is_streaming,
      response_json: JSON.stringify(payload),
    });
  }

  // biome-ignore lint/suspicious/noExplicitAny: Generic payload wrapper for webview protocol
  private _post(type: WebViewMessageType, payload: any) {
    this.postMessageToWebview({
      id: Math.random().toString(36).substring(7),
      type,
      timestamp: Date.now(),
      payload,
      version: '1.0.0',
    });
  }

  private async _saveSettings(settings: SovereignSettings) {
    const orchestrator = StateOrchestrator.getInstance();
    // Simplified: Focus on Gemini settings
    if (settings.geminiApiKey) {
        await orchestrator.applyChange({
            key: 'geminiApiKey',
            newValue: settings.geminiApiKey,
            stateSet: {} as GlobalState, // Legacy bridge compatibility
            validate: () => true,
            sanitize: () => settings.geminiApiKey,
            getCorrelationId: () => `save-settings-${Date.now()}`
        });
    }
    
    vscode.window.showInformationMessage('Settings saved (Gemini focus)');
  }

  public postMessageToWebview(message: WebViewMessage) {
    this._view?.webview.postMessage(message);
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, 'webview-ui', 'dist', 'assets', 'index.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, 'webview-ui', 'dist', 'assets', 'index.css')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleUri}" rel="stylesheet">
    <title>DietCode</title>
</head>
<body>
    <div id="root"></div>
    <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
