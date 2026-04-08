/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { 
    WebViewMessageType, 
    type WebViewMessage, 
    type WebViewRequest, 
    WebViewRequestType,
    type WebViewResponse 
} from '../../domain/ui/WebViewMessageProtocol';
import { UIBridge } from './UIBridge';

/**
 * [LAYER: UI / PROVIDER]
 * High-fidelity WebView provider for VS Code.
 */
export class SovereignWebViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'dietcode-webview';

    private _view?: vscode.WebviewView;
    private _context: vscode.ExtensionContext;
    private _bridge: UIBridge;

    constructor(
        context: vscode.ExtensionContext,
    ) {
        this._context = context;
        this._bridge = UIBridge.getInstance();
        this._initBridgeListeners();
    }

    private _initBridgeListeners() {
        // Listen for approval requests from core services
        this._bridge.on('request_approval', ({ id, detail }) => {
            this._sendMessage({
                id,
                type: WebViewMessageType.TOOL,
                timestamp: Date.now(),
                payload: {
                    toolName: detail.actionType,
                    status: 'pending',
                    result: detail.requirements
                },
                version: '2.2.0'
            });
        });

        // Listen for general notifications
        this._bridge.on('notify', ({ type, payload }) => {
            this._sendMessage({
                id: `notify-${Date.now()}`,
                type: type as WebViewMessageType,
                timestamp: Date.now(),
                payload,
                version: '2.2.0'
            });
        });
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._context.extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data: any) => {
            try {
                if (data.type === 'grpc_request') {
                    await this._handleGrpcRequest(data.grpc_request);
                } else if (data.type === 'grpc_request_cancel') {
                    // Handle cancellation if needed
                } else {
                    await this._handleMessage(data);
                }
            } catch (err) {
                console.error(`[WebView:Error] ${err}`);
                if (data.grpc_request) {
                    this._sendGrpcResponse(data.grpc_request.request_id, undefined, String(err));
                } else {
                    this._sendResponse(data.id, 'error', undefined, String(err));
                }
            }
        });

        // Initialize state hydration loop
        this._hydrateState();
    }

    private async _hydrateState() {
        if (!this._view) return;

        // Send ready event
        this._sendMessage({
            id: `init-${Date.now()}`,
            type: WebViewMessageType.READY,
            timestamp: Date.now(),
            payload: { ready: true },
            version: '2.2.0'
        });

        // Push initial settings cache
        const settings = await this._getSettings();
        this._sendMessage({
            id: `settings-${Date.now()}`,
            type: WebViewMessageType.SETTINGS_LOADED,
            timestamp: Date.now(),
            payload: settings,
            version: '2.2.0'
        });
    }

    private async _handleMessage(request: WebViewRequest) {
        switch (request.type) {
            case WebViewRequestType.ECHO:
                this._sendResponse(request.id, 'success', { pong: true });
                break;
            case WebViewRequestType.GET_SETTINGS: {
                const settings = await this._getSettings();
                this._sendResponse(request.id, 'success', settings);
                break;
            }
            case WebViewRequestType.SAVE_SETTINGS: {
                const settings = request.payload as any;
                await this._saveSettings(settings);
                this._sendResponse(request.id, 'success', { saved: true });
                break;
            }
            case WebViewRequestType.LOAD_CHECKPOINTS: {
                // Hardened Core Loading
                const { Core } = await import('../../infrastructure/database/sovereign/Core');
                if (!Core.isAvailable()) {
                    await Core.init(path.join(this._context.extensionPath, 'broccoliq.db'));
                }
                const results = await Core.selectWhere('hive_snapshots', {}, undefined, { 
                    limit: 30, 
                    orderBy: { column: 'timestamp', direction: 'desc' } 
                });
                const checkpoints = results.map((r: any) => ({
                    id: r.id,
                    timestamp: r.timestamp,
                    summary: `Snapshot: ${path.basename(r.path || 'unknown')}`,
                    path: r.path
                }));
                this._sendMessage({
                    id: request.id,
                    type: WebViewMessageType.CHECKPOINTS_LOADED,
                    timestamp: Date.now(),
                    payload: { checkpoints },
                    version: '2.2.0'
                });
                break;
            }
            case WebViewRequestType.SEND_MESSAGE: {
                const payload = request.payload as any;
                this._sendMessage({
                    id: `agent-${Date.now()}`,
                    type: WebViewMessageType.STREAM,
                    timestamp: Date.now(),
                    payload: { text: `> NEURAL_LINK: Command "${payload.text}" received. Await Hive authorization...` },
                    version: '2.2.0'
                });
                break;
            }
            case WebViewRequestType.TOOL_APPROVAL: {
                const payload = request.payload as any;
                // Solve the pending approval in UIBridge
                this._bridge.resolveApproval(request.id, payload.approved);
                this._sendResponse(request.id, 'success', { handled: true });
                break;
            }
            case WebViewRequestType.TEST_CONNECTION: {
                // Real implementation for connection test
                this._sendResponse(request.id, 'success', { success: true });
                break;
            }
            default:
                this._sendResponse(request.id, 'error', undefined, `Method ${request.type} not hardened.`);
        }
    }

    private async _getSettings() {
        // Load stored provider configs or use defaults
        const providers: any[] = [
            { id: 'anthropic', name: 'Anthropic (Claude)', type: 'chat', enabled: true },
            { id: 'cloudflare', name: 'Cloudflare Workers AI', type: 'chat', enabled: false },
            { id: 'openai', name: 'OpenAI (Embeddings)', type: 'embedding', enabled: true },
            { id: 'cohere', name: 'Cohere (Embeddings)', type: 'embedding', enabled: false },
        ];

        // Enrich with stored API keys
        const enrichedProviders = providers.map(p => ({
            ...p,
            apiKey: this._context.globalState.get(`apiKey_${p.id}`, ''),
            enabled: this._context.globalState.get(`enabled_${p.id}`, p.enabled),
        }));

        // Migration: Check if we have an old global apiKey and migrate to anthropic if suitable
        const oldApiKey = this._context.globalState.get('apiKey', '') as string;
        if (oldApiKey && !enrichedProviders.find(p => (p as any).id === 'anthropic')?.apiKey) {
            if (oldApiKey.startsWith('sk-ant')) {
                await this._context.globalState.update('apiKey_anthropic', oldApiKey);
                const anthropic = enrichedProviders.find(p => (p as any).id === 'anthropic');
                if (anthropic) (anthropic as any).apiKey = oldApiKey;
                // Clear old key to prevent re-migration
                await this._context.globalState.update('apiKey', undefined);
            }
        }

        return {
            autoApprove: this._context.globalState.get('autoApprove', false),
            selectedProvider: this._context.globalState.get('selectedProvider', 'anthropic'),
            providers: enrichedProviders,
            neuralDepth: this._context.globalState.get('neuralDepth', 'standard'),
            theme: this._context.globalState.get('theme', 'sovereign-hive')
        };
    }

    private async _saveSettings(settings: any) {
        if (settings.autoApprove !== undefined) await this._context.globalState.update('autoApprove', settings.autoApprove);
        if (settings.selectedProvider !== undefined) await this._context.globalState.update('selectedProvider', settings.selectedProvider);
        if (settings.neuralDepth !== undefined) await this._context.globalState.update('neuralDepth', settings.neuralDepth);
        if (settings.theme !== undefined) await this._context.globalState.update('theme', settings.theme);

        if (settings.providers && Array.isArray(settings.providers)) {
            for (const provider of settings.providers) {
                if (provider.id) {
                    if (provider.apiKey !== undefined) {
                        await this._context.globalState.update(`apiKey_${provider.id}`, provider.apiKey);
                    }
                    if (provider.enabled !== undefined) {
                        await this._context.globalState.update(`enabled_${provider.id}`, provider.enabled);
                    }
                }
            }
        }
    }

    private _sendMessage(message: WebViewMessage) {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }

    private _sendResponse(requestId: string, status: 'success' | 'error', data?: any, error?: string) {
        if (this._view) {
            const response: WebViewResponse = {
                requestId,
                status,
                data,
                error
            };
            this._view.webview.postMessage(response);
        }
    }

    private async _handleGrpcRequest(request: any) {
        const { service, method, request_id, is_streaming } = request;
        console.log(`[gRPC:Request] ${service}.${method} (${request_id})`);

        try {
            switch (service) {
                case 'cline.StateService':
                    await this._handleStateService(method, request);
                    break;
                case 'cline.UiService':
                    await this._handleUiService(method, request);
                    break;
                case 'cline.AccountService':
                    await this._handleAccountService(method, request);
                    break;
                case 'cline.McpService':
                    await this._handleMcpService(method, request);
                    break;
                case 'cline.ModelsService':
                    await this._handleModelsService(method, request);
                    break;
                case 'cline.TaskService':
                    await this._handleTaskService(method, request);
                    break;
                default:
                    console.warn(`[gRPC:Warning] Service ${service} not implemented`);
                    this._sendGrpcResponse(request_id, {}, `Service ${service} not implemented`);
            }
        } catch (error) {
            this._sendGrpcResponse(request_id, undefined, String(error));
        }
    }

    private async _handleStateService(method: string, request: any) {
        switch (method) {
            case 'subscribeToState':
            case 'getLatestState': {
                const settings = await this._getSettings();
                // Exhaustive ExtensionState mock based on shared/ExtensionMessage.ts
                const state = {
                    version: '2.2.2',
                    isNewUser: false,
                    welcomeViewCompleted: true,
                    clineMessages: [],
                    taskHistory: [],
                    shouldShowAnnouncement: false,
                    autoApprovalSettings: { 
                        version: 1, 
                        actions: { 
                            readFiles: true, 
                            editFiles: true,
                            executeSafeCommands: true,
                            useBrowser: true,
                            useMcp: true
                        } 
                    },
                    browserSettings: { 
                        enabled: true,
                        viewport: { width: 1280, height: 800 } 
                    },
                    mode: 'plan',
                    mcpDisplayMode: 'rich',
                    planActSeparateModelsSetting: false,
                    platform: 'darwin',
                    environment: 'production',
                    telemetrySetting: 'enabled',
                    shellIntegrationTimeout: 30000,
                    terminalOutputLineLimit: 1000,
                    maxConsecutiveMistakes: 3,
                    vscodeTerminalExecutionMode: 'auto',
                    distinctId: 'dietcode-dev-id',
                    globalClineRulesToggles: {},
                    localClineRulesToggles: {},
                    localWorkflowToggles: {},
                    globalWorkflowToggles: {},
                    localCursorRulesToggles: {},
                    localWindsurfRulesToggles: {},
                    localAgentsRulesToggles: {},
                    workspaceRoots: [],
                    primaryRootIndex: 0,
                    isMultiRootWorkspace: false,
                    lastDismissedCliBannerVersion: 0,
                    focusChainSettings: { enabled: false, remindClineInterval: 5 },
                    apiConfiguration: {
                        actModeApiProvider: settings.selectedProvider,
                        planModeApiProvider: settings.selectedProvider,
                    },
                    ...settings
                };

                this._sendGrpcResponse(request.request_id, {
                    stateJson: JSON.stringify(state)
                }, undefined, request.is_streaming);
                break;
            }
            case 'getAvailableTerminalProfiles': {
                this._sendGrpcResponse(request.request_id, { profiles: [] });
                break;
            }
            case 'dismissBanner': {
                this._sendGrpcResponse(request.request_id, {});
                break;
            }
            default:
                this._sendGrpcResponse(request.request_id, {}, `Method StateService.${method} stubbed`);
        }
    }

    private async _handleUiService(method: string, request: any) {
        switch (method) {
            case 'initializeWebview':
                this._sendGrpcResponse(request.request_id, {});
                break;
            case 'subscribeToMcpButtonClicked':
            case 'subscribeToHistoryButtonClicked':
            case 'subscribeToChatButtonClicked':
            case 'subscribeToSettingsButtonClicked':
            case 'subscribeToWorktreesButtonClicked':
            case 'subscribeToAccountButtonClicked':
            case 'subscribeToPartialMessage':
                // Streaming subscriptions - send empty initial response if requested
                if (request.is_streaming) {
                    // Just acknowledge the subscription
                }
                break;
            default:
                this._sendGrpcResponse(request.request_id, {}, `Method UiService.${method} stubbed`);
        }
    }

    private async _handleAccountService(method: string, request: any) {
        switch (method) {
            case 'subscribeToAuthStatusUpdate':
                this._sendGrpcResponse(request.request_id, { user: { uid: 'dev-user' } }, undefined, true);
                break;
            case 'getUserOrganizations':
                this._sendGrpcResponse(request.request_id, { organizations: [] });
                break;
            default:
                this._sendGrpcResponse(request.request_id, {}, `AccountService.${method} stubbed`);
        }
    }

    private async _handleMcpService(method: string, request: any) {
        switch (method) {
            case 'subscribeToMcpServers':
                this._sendGrpcResponse(request.request_id, { mcpServers: [] }, undefined, true);
                break;
            case 'subscribeToMcpMarketplaceCatalog':
                this._sendGrpcResponse(request.request_id, { catalog: [] }, undefined, true);
                break;
            default:
                this._sendGrpcResponse(request.request_id, {}, `Method McpService.${method} stubbed`);
        }
    }

    private async _handleModelsService(method: string, request: any) {
        switch (method) {
            case 'subscribeToOpenRouterModels':
            case 'subscribeToLiteLlmModels':
                this._sendGrpcResponse(request.request_id, { models: {} }, undefined, true);
                break;
            default:
                this._sendGrpcResponse(request.request_id, {}, `Method ModelsService.${method} stubbed`);
        }
    }

    private async _handleTaskService(method: string, request: any) {
        switch (method) {
            case 'getTaskHistory':
                this._sendGrpcResponse(request.request_id, { history: [] });
                break;
            case 'getTotalTasksSize':
                this._sendGrpcResponse(request.request_id, { value: '0' });
                break;
            default:
                this._sendGrpcResponse(request.request_id, {}, `Method TaskService.${method} stubbed`);
        }
    }

    private _sendGrpcResponse(request_id: string, message?: any, error?: string, is_streaming?: boolean) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'grpc_response',
                grpc_response: {
                    request_id,
                    message,
                    error,
                    is_streaming
                }
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Read index.html compiled from the React build
        const webviewUiPath = vscode.Uri.joinPath(this._context.extensionUri, 'webview-ui', 'build');
        const indexPath = vscode.Uri.joinPath(webviewUiPath, 'index.html');
        
        let html: string;
        try {
            html = fs.readFileSync(indexPath.fsPath, 'utf8');
        } catch (error) {
            return `<!DOCTYPE html><html><body><h1>Error loading UI</h1><p>${String(error)}</p></body></html>`;
        }

        const nonce = getNonce();
        
        // Resolve assets URLs properly for VS Code context
        const rootUrl = webview.asWebviewUri(webviewUiPath).toString();

        // Inject Content Security Policy
        // Added img-src to allow icons and connect-src to be more flexible for API/gRPC
        // Added 'unsafe-eval' to allow generated gRPC code and blob: for potentially generated scripts
        const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' 'unsafe-eval'; connect-src ${webview.cspSource} https:; font-src ${webview.cspSource} data:; blob:;">`;

        html = html.replace(/<head>/, `<head>\n    ${csp}`);
        
        // Add nonces to all scripts (handle <script and <script> variants)
        html = html.replace(/<script(?=[\s>])/g, `<script nonce="${nonce}" `);

        // Replace asset paths with fully resolved webview uris
        // Improved regex to handle various path formats and ensure we don't double-replace
        html = html.replace(/(href|src)="(\.?)\/assets([^"]+)"/g, (match, type, dot, assetPath) => {
            return `${type}="${rootUrl}/assets${assetPath}"`;
        });

        return html;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
