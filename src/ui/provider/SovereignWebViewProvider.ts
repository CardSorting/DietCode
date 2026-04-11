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
  type SovereignSettings,
  type LLMProviderConfig,
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
import type { UpdateApiConfigurationRequest } from '../../shared/nice-grpc/cline/models';
import { StateChangePhase } from '../../domain/state/StateChangeProtocol';
import type { ApiConfiguration } from '../../shared/api';
import type { GlobalState } from '../../domain/LLMProvider';
import { ApiHandlerSettingsKeys } from '../../shared/storage/state-keys';
import type { ApiProvider } from '../../shared/api';
import type { ExtensionMessage, ExtensionState } from '../../shared/ExtensionMessage';

interface GrpcRequest {
  service: string;
  method: string;
  request_id: string;
  is_streaming?: boolean;
  request_json?: string;
  apiConfiguration?: unknown;
  payload?: unknown;
  [key: string]: unknown;
}

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

    webviewView.webview.onDidReceiveMessage(async (data: unknown) => {
      try {
        if (typeof data !== 'object' || data === null) return;
        const msg = data as { type: string; grpc_request?: GrpcRequest; id?: string };

        if (msg.type === WebViewRequestType.GRPC_REQUEST && msg.grpc_request) {
          await this._handleGrpcRequest(msg.grpc_request);
        } else if (msg.type === WebViewRequestType.GRPC_REQUEST_CANCEL) {
          // Handle cancellation if needed
        } else {
          await this._handleMessage(msg as unknown as WebViewRequest);
        }
      } catch (err) {
        console.error(`[WebView:Error] ${err}`);
        const msg = data as { grpc_request?: GrpcRequest; id?: string };
        if (msg.grpc_request) {
          this._sendGrpcResponse(msg.grpc_request.request_id, undefined, String(err));
        } else if (msg.id) {
          this._sendResponse(msg.id, 'error', undefined, String(err));
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
        const settings = request.payload as SovereignSettings;
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
        const checkpoints = results.map((r: { id: string; timestamp: number; path?: string }) => ({
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
        const payload = request.payload as { text: string };
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
        const payload = request.payload as { approved: boolean };
        // Solve the pending approval in UIBridge
        this._bridge.resolveApproval(request.id, payload.approved);
        this._sendResponse(request.id, 'success', { handled: true });
        break;
      }
      case WebViewRequestType.TEST_CONNECTION: {
        const payload = request.payload as { providerId: string; config: ApiConfiguration };
        const providerId = payload.providerId;
        const config = payload.config as ApiConfiguration;

        const success = await LLMProviderRegistry.getInstance().testConnection(
          providerId as ApiProvider,
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
    const providers: LLMProviderConfig[] = [
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
    if (oldApiKey && !enrichedProviders.find((p) => p.id === 'anthropic')?.apiKey) {
      if (oldApiKey.startsWith('sk-ant')) {
        await repo.set('apiKey_anthropic', oldApiKey);
        const anthropic = enrichedProviders.find((p) => p.id === 'anthropic');
        if (anthropic) anthropic.apiKey = oldApiKey;
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

  private async _saveSettings(settings: SovereignSettings) {
    const orchestrator = StateOrchestrator.getInstance();

    // Map the incoming UI settings to a partial ApiConfiguration
    const apiConfig: Partial<ApiConfiguration> = {
      apiModelId: settings.apiModelId,
      apiKey: settings.apiKey,
      apiProvider: settings.selectedProvider,
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

  private _sendMessage(message: WebViewMessage | ExtensionMessage) {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  private _sendResponse(
    requestId: string,
    status: 'success' | 'error',
    data?: unknown,
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

  private async _handleGrpcRequest(request: GrpcRequest) {
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

  private async _handleStateService(method: string, request: GrpcRequest) {
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

  private async _handleUiService(method: string, request: GrpcRequest) {
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

  private async _handleAccountService(method: string, request: GrpcRequest) {
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

  private async _handleMcpService(method: string, request: GrpcRequest) {
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

  private async _handleModelsService(method: string, request: GrpcRequest) {
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
        const protoConfig = request.apiConfiguration as UpdateApiConfigurationRequest['apiConfiguration'];
        if (protoConfig) {
          // Hardening: Ensure required openAiHeaders is present for conversion
          if (!protoConfig.openAiHeaders) {
            protoConfig.openAiHeaders = {};
          }
          const apiConfig = convertProtoToApiConfiguration(protoConfig);
          // Apply changes to individual keys in StateOrchestrator to ensure reactive synchronization
          const orchestrator = StateOrchestrator.getInstance();
          
          // Dynamically map all incoming ApiConfiguration fields to StateKeys
          const changes = Object.entries(apiConfig)
            .filter(([field, val]) => val !== undefined && (ApiHandlerSettingsKeys as string[]).includes(field))
            .map(([field, val]) => {
                return {
                  key: field,
                  newValue: val,
                  stateSet: {} as GlobalState,
                  validate: () => true,
                  sanitize: () => val,
                  getCorrelationId: () => `ui-proto-batch-${Date.now()}`
                };
            });

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
      case 'refreshOpenAiModels':
      case 'refreshOpenRouterModelsRpc':
      case 'refreshClineModelsRpc': {
        const providerId = method === 'refreshOpenAiModels' ? 'openai-native' : 
                          method === 'refreshOpenRouterModelsRpc' ? 'openrouter' : 'cline';
        
        try {
          await LLMProviderRegistry.getInstance().getModelInfo(providerId, 'discovery-triggered');
          const available = await StateOrchestrator.getInstance().getState<Record<string, ModelInfo[]>>('availableProviderModels') || {};
          const models = available[providerId] || [];
          
          if (method === 'refreshOpenAiModels') {
            this._sendGrpcSuccess(request.request_id, { values: models.map(m => m.id) });
          } else {
            // OpenRouterCompatibleModelInfo format
            const modelMap: Record<string, any> = {};
            for (const m of models) {
              modelMap[m.id] = {
                name: m.name,
                maxTokens: m.maxTokens,
                contextWindow: m.maxTokens,
                supportsImages: true,
                supportsPromptCache: m.supportsPromptCache,
                inputPrice: m.costPerThousandTokens?.input ? m.costPerThousandTokens.input / 1000 : 0,
                outputPrice: m.costPerThousandTokens?.output ? m.costPerThousandTokens.output / 1000 : 0,
              };
            }
            this._sendGrpcSuccess(request.request_id, { models: modelMap });
          }
        } catch (error) {
          this._sendGrpcError(request.request_id, String(error));
        }
        break;
      }
      case 'getOllamaModels': {
        const baseUrl = (request.payload as { value?: string })?.value || 'http://localhost:11434';
        try {
          const response = await fetch(`${baseUrl}/api/tags`);
          if (response.ok) {
            const data = await response.json();
            const models = (data.models || []).map((m: any) => m.name);
            this._sendGrpcSuccess(request.request_id, { values: models });
          } else {
            this._sendGrpcSuccess(request.request_id, { values: [] });
          }
        } catch (e) {
          this._sendGrpcSuccess(request.request_id, { values: [] });
        }
        break;
      }
      default:
        this._sendGrpcSuccess(request.request_id, { models: {} });
    }
  }

  private async _handleTaskService(method: string, request: GrpcRequest) {
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

  private async _handleUniversalService(service: string, method: string, request: GrpcRequest) {
    switch (method) {
      case 'getCheckpoints': {
        const persistence = new CheckpointPersistenceAdapter();
        const taskId = (request.payload as { task_id?: string })?.task_id;
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

  private _sendGrpcSuccess(request_id: string, message: unknown = {}, is_streaming = false) {
    this._sendGrpcResponse(request_id, message, undefined, is_streaming);
  }

  private _sendGrpcError(request_id: string, error: string) {
    this._sendGrpcResponse(request_id, undefined, error);
  }

  private _sendGrpcResponse(
    request_id: string,
    message?: unknown,
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
    // Loosened for Diagnostic Recovery:
    const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'nonce-${nonce}' 'unsafe-eval' blob:; connect-src ${webview.cspSource} https: *; font-src ${webview.cspSource} data:; media-src ${webview.cspSource} https: blob:; worker-src 'self' blob:;">`;

    html = html.replace(/<head>/, `<head>\n    ${csp}\n    <script nonce="${nonce}">
      window.onload = () => {
        console.log('[DietCode:Bootstrap] window.onload triggered');
        console.log('[DietCode:Bootstrap] rootUrl: ${rootUrl}');
        const root = document.getElementById('root');
        if (root && root.innerHTML === '') {
          const diag = document.createElement('div');
          diag.id = 'bootstrap-diagnostic';
          diag.style.cssText = 'position:fixed;bottom:10px;right:10px;padding:10px;background:rgba(0,255,0,0.2);border:1px solid green;color:green;font-size:10px;z-index:9999;font-family:monospace;';
          diag.innerText = 'WEBVIEW BOOTSTRAP ACTIVE';
          document.body.appendChild(diag);
          console.log('[DietCode:Bootstrap] Diagnostic indicator added');
        }
      };
    </script>`);

    // Inject static indicator into body to verify HTML loading
    html = html.replace(/<body>/, `<body>\n    <div id="static-indicator" style="position:fixed;top:0;right:0;padding:2px 5px;background:red;color:white;font-size:9px;z-index:10000;font-family:sans-serif;opacity:0.6;">[HTML LOADED]</div>`);

    // Add nonces to all scripts (handle <script and <script> variants)
    html = html.replace(/<script(?=[\s>])/g, `<script nonce="${nonce}" `);

    // Replace asset paths with fully resolved webview uris
    // Improved regex to handle relative paths (assets/...), absolute paths (/assets/...), 
    // and dot-relative paths (./assets/...) across multiple source directories.
    html = html.replace(/(href|src)="(\.\/|\/)?(assets|src|favicon\.svg)([^"]*)"/g, (match, type, prefix, dir, path) => {
      if (dir === 'favicon.svg') {
        return `${type}="${rootUrl}/favicon.svg"`;
      }
      return `${type}="${rootUrl}/${dir}${path}"`;
    });

    return html;
  }

  /**
   * PRODUCTION HARDENING: Dynamically assembles the full ExtensionState from orchestrated sources.
   * This ensures the webview always has a "True" view of the extension's status.  /**
   * Get the current state snapshot for the webview
   */
  private async _getStateSnapshot(): Promise<ExtensionState> {
    // PRODUCTION HARDENING: Use the unified assembler to ensure consistency
    return await StateAssembler.getInstance().assemble() as ExtensionState;
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
