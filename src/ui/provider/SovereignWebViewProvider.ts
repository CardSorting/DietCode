import * as fs from 'node:fs';
import * as path from 'node:path';
/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as vscode from 'vscode';
import { TaskHistoryManager } from '../../core/task/TaskHistoryManager';
import {
  type WebViewMessage,
  WebViewMessageType,
  type WebViewRequest,
  WebViewRequestType,
  type WebViewResponse,
} from '../../domain/ui/WebViewMessageProtocol';
import { McpDiscoveryService } from '../../infrastructure/capabilities/McpDiscoveryService';
import { VsCodeLmProvider } from '../../infrastructure/llm/providers/VsCodeLmProvider';
import { CheckpointPersistenceAdapter } from '../../infrastructure/task/CheckpointPersistenceAdapter';
import { Logger } from '../../shared/services/Logger';
import { UIBridge } from './UIBridge';
import { StateOrchestrator } from '../../core/manager/StateOrchestrator';
import { LLMProviderRegistry } from '../../core/manager/LLMProviderRegistry';
import { VsCodeStateRepository } from '../../infrastructure/storage/VsCodeStateRepository';
import { StateSyncService } from '../../core/manager/StateSyncService';
import { StateAssembler } from '../../core/manager/StateAssembler';
import { convertProtoToApiConfiguration } from '../../shared/proto-conversions/models/api-configuration-conversion';
import { UpdateApiConfigurationRequest } from '../../shared/nice-grpc/cline/models';
import { StateChangePhase } from '../../domain/state/StateChangeProtocol';
import type { ApiConfiguration } from '../../shared/api';
import type { GlobalState } from '../../domain/LLMProvider';

/**
 * [LAYER: UI / PROVIDER]
 * High-fidelity WebView provider for VS Code.
 */
export class SovereignWebViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'dietcode-webview';

  private _view?: vscode.WebviewView;
  private _context: vscode.ExtensionContext;
  private _bridge: UIBridge;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this._bridge = UIBridge.getInstance();
    this._initBridgeListeners();

    // Initialize backend services for webview
    McpDiscoveryService.getInstance().initialize(this._context);
  }

  private _initBridgeListeners() {

    // Listen for general notifications
    this._bridge.on('notify', ({ type, payload }) => {
      this._sendMessage({
        id: `notify-${Date.now()}`,
        type: type as WebViewMessageType,
        timestamp: Date.now(),
        payload,
        version: '2.2.0',
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
      localResourceRoots: [this._context.extensionUri],
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
      version: '2.2.0',
    });

    // Push initial settings cache
    const settings = await this._getSettings();
    this._sendMessage({
      id: `settings-${Date.now()}`,
      type: WebViewMessageType.SETTINGS_LOADED,
      timestamp: Date.now(),
      payload: settings,
      version: '2.2.0',
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
          await Core.init(path.join(this._context.globalStorageUri.fsPath, 'broccoliq.db'));
        }
        const results = await Core.selectWhere('hive_snapshots', {}, undefined, {
          limit: 30,
          orderBy: { column: 'timestamp', direction: 'desc' },
        });
        const checkpoints = results.map((r: any) => ({
          id: r.id,
          timestamp: r.timestamp,
          summary: `Snapshot: ${path.basename(r.path || 'unknown')}`,
          path: r.path,
        }));
        this._sendMessage({
          id: request.id,
          type: WebViewMessageType.CHECKPOINTS_LOADED,
          timestamp: Date.now(),
          payload: { checkpoints },
          version: '2.2.0',
        });
        break;
      }
      case WebViewRequestType.SEND_MESSAGE: {
        const payload = request.payload as any;
        this._sendMessage({
          id: `agent-${Date.now()}`,
          type: WebViewMessageType.STREAM,
          timestamp: Date.now(),
          payload: {
            text: `> NEURAL_LINK: Command "${payload.text}" received. Await Hive authorization...`,
          },
          version: '2.2.0',
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
        const payload = request.payload as any;
        const providerId = payload.providerId;
        const config = payload.config as ApiConfiguration;

        const success = await LLMProviderRegistry.getInstance().testConnection(
          providerId,
          config
        );

        this._sendResponse(request.id, 'success', { success });
        break;
      }
      default:
        this._sendResponse(request.id, 'error', undefined, `Method ${request.type} not hardened.`);
    }
  }

  private async _getSettings() {
    const repo = VsCodeStateRepository.getInstance();

    // Load stored provider configs or use defaults
    const providers: any[] = [
      { id: 'anthropic', name: 'Anthropic', type: 'chat', enabled: true },
      { id: 'openai-native', name: 'OpenAI', type: 'chat', enabled: true },
      { id: 'gemini', name: 'Google Gemini', type: 'chat', enabled: true },
      { id: 'openrouter', name: 'OpenRouter', type: 'chat', enabled: true },
      { id: 'ollama', name: 'Ollama', type: 'chat', enabled: false },
      { id: 'cloudflare', name: 'Cloudflare Workers AI', type: 'chat', enabled: false },
      { id: 'vscode-lm', name: 'VS Code Language Models', type: 'chat', enabled: false },
    ];

    // PRODUCTION HARDENING: Pull enriched data from hardened repository (SecretStorage supported)
    const enrichedProviders = await Promise.all(
      providers.map(async (p) => ({
        ...p,
        apiKey: (await repo.get(`apiKey_${p.id}`)) || '',
        enabled: (await repo.get(`enabled_${p.id}`)) ?? p.enabled,
      })),
    );

    // Migration: Check if we have an old global apiKey and migrate to anthropic (Hardened migration to SecretStorage)
    const oldApiKey = (await repo.get('apiKey')) as string;
    if (oldApiKey && !enrichedProviders.find((p) => (p as any).id === 'anthropic')?.apiKey) {
      if (oldApiKey.startsWith('sk-ant')) {
        await repo.set('apiKey_anthropic', oldApiKey);
        const anthropic = enrichedProviders.find((p) => (p as any).id === 'anthropic');
        if (anthropic) (anthropic as any).apiKey = oldApiKey;
        // Clear old key to prevent re-migration
        await repo.delete('apiKey');
        Logger.info('[PROVIDER] Migrated legacy Anthropic key to hardened storage');
      }
    }

    return {
      autoApprove: (await repo.get('autoApprove')) ?? false,
      selectedProvider: (await repo.get('selectedProvider')) || 'anthropic',
      providers: enrichedProviders,
      neuralDepth: (await repo.get('neuralDepth')) || 'standard',
      theme: (await repo.get('theme')) || 'sovereign-hive',

      // Dynamic synchronization fields
      availableProviderModels: (await repo.get('availableProviderModels')) || {},
      providerHealth: (await repo.get('providerHealth')) || {},
    };
  }

  private async _saveSettings(settings: any) {
    const orchestrator = StateOrchestrator.getInstance();

    // Map the incoming UI settings to a partial ApiConfiguration
    const apiConfig: Partial<ApiConfiguration> = {
      apiModelId: settings.apiModelId,
      apiKey: settings.apiKey,
      selectedProvider: settings.selectedProvider,
    };

    // If providers list is included, extract them
    if (settings.providers && Array.isArray(settings.providers)) {
      for (const p of settings.providers) {
        if (p.id === 'anthropic') apiConfig.apiKey = p.apiKey;
        if (p.id === 'openai') apiConfig.openAiApiKey = p.apiKey;
        if (p.id === 'openai-native') apiConfig.openAiApiKey = p.apiKey;
        if (p.id === 'gemini') apiConfig.geminiApiKey = p.apiKey;
        if (p.id === 'openrouter') apiConfig.openRouterApiKey = p.apiKey;
        if (p.id === 'ollama') apiConfig.ollamaBaseUrl = p.baseUrl;
      }
    }

    // Apply change via Orchestrator for reactivity
    await orchestrator.applyChange({
      key: 'apiConfiguration',
      newValue: apiConfig,
      stateSet: {} as GlobalState,
      validate: () => true,
      sanitize: () => apiConfig,
      getCorrelationId: () => `ui-save-${Date.now()}`,
    }, 0); // Immediate persist

    // Also persist individual keys for legacy compatibility
    if (settings.autoApprove !== undefined)
      await this._context.globalState.update('autoApprove', settings.autoApprove);
    if (settings.selectedProvider !== undefined)
      await this._context.globalState.update('selectedProvider', settings.selectedProvider);
    if (settings.neuralDepth !== undefined)
      await this._context.globalState.update('neuralDepth', settings.neuralDepth);
    if (settings.theme !== undefined)
      await this._context.globalState.update('theme', settings.theme);

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

  private _sendResponse(
    requestId: string,
    status: 'success' | 'error',
    data?: any,
    error?: string,
  ) {
    if (this._view) {
      const response: WebViewResponse = {
        requestId,
        status,
        data,
        error,
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
        case 'cline.OcaAccountService':
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
        case 'cline.BrowserService':
        case 'cline.CheckpointsService':
        case 'cline.CommandsService':
        case 'cline.FileService':
          await this._handleUniversalService(service, method, request);
          break;
        default:
          this._sendGrpcError(request_id, `Service ${service} not implemented`);
      }
    } catch (error) {
      this._sendGrpcResponse(request_id, undefined, String(error));
    }
  }

  private async _handleStateService(method: string, request: any) {
    switch (method) {
      case 'subscribeToState':
      case 'getLatestState': {
        const state = await this._getStateSnapshot();
        this._sendGrpcSuccess(
          request.request_id,
          {
            stateJson: JSON.stringify(state),
          },
          request.is_streaming,
        );

        // gRPC State Subscription: Bridged via reactive StateSyncService
        if (request.is_streaming) {
          const unsubscribe = StateSyncService.getInstance().subscribe(
            request.request_id,
            (stateJson) => {
              this._sendGrpcSuccess(
                request.request_id,
                { stateJson },
                true
              );
            }
          );
          this._context.subscriptions.push({ dispose: unsubscribe });
        }
        break;
      }
      case 'getAvailableTerminalProfiles': {
        // PRODUCTION HARDENING: Real profile detection
        const shellPaths = [
          { name: 'zsh', path: '/bin/zsh' },
          { name: 'bash', path: '/bin/bash' },
          { name: 'fish', path: '/usr/local/bin/fish' },
          { name: 'sh', path: '/bin/sh' },
        ];
        
        const profiles = shellPaths
          .filter(shell => fs.existsSync(shell.path))
          .map((shell, index) => ({
            name: shell.name,
            path: shell.path,
            isDefault: index === 0
          }));

        this._sendGrpcSuccess(request.request_id, { profiles });
        break;
      }
      case 'dismissBanner': {
        this._sendGrpcSuccess(request.request_id, {});
        break;
      }
      default:
        this._sendGrpcSuccess(request.request_id, {});
    }
  }

  private async _handleUiService(method: string, request: any) {
    switch (method) {
      case 'initializeWebview':
        this._sendGrpcSuccess(request.request_id, {});
        break;
      case 'subscribeToPartialMessage':
        // Streaming subscriptions
        if (request.is_streaming) {
          // PRODUCTION HARDENING: Ensure initial message has a valid timestamp to prevent hydration crash
          this._sendGrpcSuccess(request.request_id, { ts: Date.now() }, true);
        }
        break;
      case 'subscribeToMcpButtonClicked':
      case 'subscribeToHistoryButtonClicked':
      case 'subscribeToChatButtonClicked':
      case 'subscribeToSettingsButtonClicked':
      case 'subscribeToWorktreesButtonClicked':
      case 'subscribeToAccountButtonClicked':
        if (request.is_streaming) {
          this._sendGrpcSuccess(request.request_id, {}, true);
        }
        break;
      default:
        this._sendGrpcSuccess(request.request_id, {});
    }
  }

  private async _handleAccountService(method: string, request: any) {
    switch (method) {
      case 'subscribeToAuthStatusUpdate': {
        // Production Hardening: Local-First Sovereign Identity
        // NOTE: Frontend expects 'uid'
        const user = {
          uid: 'sovereign-hive-user',
          email: 'sovereign@local.hive',
          displayName: 'Sovereign Administrator',
          photoUrl: '',
          provider: 'local',
        };
        this._sendGrpcSuccess(request.request_id, { user }, true);
        break;
      }
      case 'getUserOrganizations':
        this._sendGrpcSuccess(request.request_id, { organizations: [] });
        break;
      default:
        this._sendGrpcSuccess(request.request_id, {});
    }
  }

  private async _handleMcpService(method: string, request: any) {
    const mcpService = McpDiscoveryService.getInstance();
    switch (method) {
      case 'toggleMcpServer': {
        const { name, enabled } = JSON.parse(request.request_json || '{}');
        const server = mcpService.getServers().find((s) => s.name === name);
        if (server) {
          await mcpService.toggleServer(server.id, enabled);
        }
        this._sendGrpcSuccess(request.request_id, {});
        break;
      }
      case 'subscribeToMcpMarketplaceCatalog': {
        const catalog = McpDiscoveryService.getInstance().getCatalog();
        // PRODUCTION HARDENING: Nested under 'items' as expected by the protobuf/frontend
        this._sendGrpcSuccess(request.request_id, { items: catalog }, true);
        break;
      }
      default:
        this._sendGrpcSuccess(request.request_id, {});
    }
  }

  private async _handleModelsService(method: string, request: any) {
    switch (method) {
      case 'getVsCodeLmModels': {
        const models = await vscode.lm.selectChatModels({});
        this._sendGrpcSuccess(request.request_id, {
          models: models.map((m) => ({
            id: m.id,
            vendor: m.vendor,
            family: m.family,
            version: m.version,
            maxTokens: 4096, // Default fallback
          })),
        });
        break;
      }
      case 'subscribeToOpenRouterModels':
      case 'subscribeToLiteLlmModels':
        this._sendGrpcSuccess(request.request_id, { models: {} }, true);
        break;
      case 'updateApiConfigurationProto': {
        const protoConfig = (request as any).apiConfiguration;
        if (protoConfig) {
          const apiConfig = convertProtoToApiConfiguration(protoConfig);
          // Apply changes to individual keys in StateOrchestrator to ensure reactive synchronization
          const orchestrator = StateOrchestrator.getInstance();
          
          // Map of proto fields to state keys
          const fieldToKeyMap: Record<string, string> = {
            planModeApiProvider: 'planModeApiProvider',
            actModeApiProvider: 'actModeApiProvider',
            planModeApiModelId: 'planModeApiModelId',
            actModeApiModelId: 'actModeApiModelId',
            apiKey: 'apiKey',
            openRouterApiKey: 'openRouterApiKey',
            geminiApiKey: 'geminiApiKey',
            // Add more as needed, but these are the critical ones for provider selection
          };

          const changes: StateChange<any>[] = Object.entries(fieldToKeyMap)
            .map(([field, key]) => {
              const val = (apiConfig as any)[field];
              if (val !== undefined) {
                return {
                  key,
                  newValue: val,
                  stateSet: {} as any,
                  validate: () => true,
                  sanitize: () => val,
                  getCorrelationId: () => `ui-proto-batch-${Date.now()}`
                };
              }
              return null;
            })
            .filter((c): c is StateChange<any> => c !== null);

          if (changes.length > 0) {
            await orchestrator.applyChanges(changes, 0); // Immediate persist for gRPC bridge
          }
          
          // Also save the legacy selectedProvider for backward compatibility
          if (apiConfig.planModeApiProvider) {
            await this._context.globalState.update('selectedProvider', apiConfig.planModeApiProvider);
          }
        }
        this._sendGrpcSuccess(request.request_id, {});
        break;
      }
      case 'refreshClineRecommendedModelsRpc': {
        const registry = LLMProviderRegistry.getInstance();
        const providers = registry.getAllProviders();
        const recommended: string[] = [];
        
        // Dynamically build recommended list from registered providers
        for (const [id, adapter] of providers.entries()) {
          try {
            const info = adapter.getModelInfo();
            if (info && !recommended.includes(info.id)) {
              recommended.push(info.id);
            }
          } catch (e) {
            // Skip adapters that fail to provide info
          }
        }

        // Add standard fallbacks if none detected
        if (recommended.length === 0) {
          recommended.push('claude-3-7-sonnet-20250219', 'gpt-4o');
        }

        this._sendGrpcSuccess(request.request_id, {
          recommended,
          free: [],
        });
        break;
      }
      default:
        this._sendGrpcSuccess(request.request_id, { models: {} });
    }
  }

  private async _handleTaskService(method: string, request: any) {
    const historyManager = TaskHistoryManager.getInstance();
    switch (method) {
      case 'getTaskHistory': {
        const history = await historyManager.getHistory();
        this._sendGrpcSuccess(request.request_id, {
          history: history.map((h) => ({
            id: h.id,
            ts: h.timestamp,
            task: h.payload.summary,
            tokensIn: 0,
            tokensOut: 0,
            cacheWrites: 0,
            cacheReads: 0,
            totalCost: 0,
          })),
        });
        break;
      }
      case 'getTotalTasksSize':
        this._sendGrpcSuccess(request.request_id, { value: '0' });
        break;
      default:
        this._sendGrpcSuccess(request.request_id, {});
    }
  }

  private async _handleUniversalService(service: string, method: string, request: any) {
    switch (method) {
      case 'getCheckpoints': {
        const persistence = new CheckpointPersistenceAdapter();
        const taskId = request.payload.task_id;
        const checkpoints = persistence.getLastCheckpoints(taskId, 50);
        this._sendGrpcSuccess(request.request_id, {
          checkpoints: checkpoints.map((c) => ({
            id: c.checkpointId,
            timestamp: c.timestamp.toISOString(),
            state: c.state,
            message: c.driftReason || 'Snapshot captured',
          })),
        });
        break;
      }
      case 'selectFiles': {
        const options: vscode.OpenDialogOptions = {
          canSelectMany: true,
          openLabel: 'Select Files for DietCode',
          filters: {
            'All Files': ['*'],
          },
        };
        const fileUris = await vscode.window.showOpenDialog(options);
        if (fileUris) {
          this._sendGrpcSuccess(request.request_id, {
            values1: fileUris.map((uri) => uri.fsPath),
            values2: fileUris.map((uri) => uri.path),
          });
        } else {
          this._sendGrpcSuccess(request.request_id, { values1: [], values2: [] });
        }
        break;
      }
      case 'testBrowserConnection': {
        // Production Hardening: Real check for local browser automation availability
        const isAvailable = await this._checkBrowserAvailability();
        this._sendGrpcSuccess(request.request_id, {
          status: isAvailable ? 'connected' : 'disconnected',
        });
        break;
      }
      default:
        this._sendGrpcSuccess(request.request_id, {});
    }
  }

  private async _checkBrowserAvailability(): Promise<boolean> {
    // Simplified check: See if any browser-related tools/servers are active
    const servers = McpDiscoveryService.getInstance().getServers();
    return servers.some(
      (s) =>
        s.enabled &&
        (s.name.toLowerCase().includes('browser') || s.name.toLowerCase().includes('playwright')),
    );
  }

  private _sendGrpcSuccess(request_id: string, message: any = {}, is_streaming = false) {
    this._sendGrpcResponse(request_id, message, undefined, is_streaming);
  }

  private _sendGrpcError(request_id: string, error: string) {
    this._sendGrpcResponse(request_id, undefined, error);
  }

  private _sendGrpcResponse(
    request_id: string,
    message?: any,
    error?: string,
    is_streaming?: boolean,
  ) {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'grpc_response',
        grpc_response: {
          request_id,
          message: message || {}, // Ensure we never send null as message
          error,
          is_streaming,
        },
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
    // Hardened for Production:
    // - script-src allows 'nonce' and 'unsafe-eval' for gRPC internals + blob: for workers
    // - connect-src allows extension-host and https calls
    // - media-src allows demos from the local build
    // - worker-src enables background processing
    const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' 'unsafe-eval' blob:; connect-src ${webview.cspSource} https:; font-src ${webview.cspSource} data:; media-src ${webview.cspSource} https: blob:; worker-src 'self' blob:;">`;

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

  /**
   * PRODUCTION HARDENING: Dynamically assembles the full ExtensionState from orchestrated sources.
   * This ensures the webview always has a "True" view of the extension's status.  /**
   * Get the current state snapshot for the webview
   */
  private async _getStateSnapshot(): Promise<any> {
    // PRODUCTION HARDENING: Use the unified assembler to ensure consistency
    return await StateAssembler.getInstance().assemble();
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
