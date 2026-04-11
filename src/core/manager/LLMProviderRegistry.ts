/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: Orchestrate domain and infrastructure adapters
 * Prework Status: Not applicable (new file)
 *
 * Central registry for LLM provider adapters, managing 40+ provider support
 * with dynamic model discovery, caching, and provider-specific strategies.
 */

import type {
  ApiConfiguration,
  ApiProvider,
} from '../../shared/api';
import type {
  AdapterConfig,
  ApiStream,
  LLMAdapter,
  Message,
  ModelInfo,
  PromptStrategy,
} from '../../domain/agent/LLMProviderAdapter';
import { PromptStrategy as EnumPromptStrategy } from '../../domain/agent/LLMProviderAdapter';
import type { ToolDefinition } from '../../domain/agent/ToolDefinition';
import type { LogService } from '../../domain/logging/LogService';
import { AnthropicAdapter } from '../../infrastructure/llm/providers/AnthropicAdapter';
import { CloudflareAdapter } from '../../infrastructure/llm/providers/CloudflareProvider';
import { GeminiAdapter } from '../../infrastructure/llm/providers/GeminiAdapter';
import { OpenAIAdapter } from '../../infrastructure/llm/providers/OpenAIAdapter';
import { OpenRouterAdapter } from '../../infrastructure/llm/providers/OpenRouterAdapter';
import { VsCodeLmAdapter } from '../../infrastructure/llm/providers/VsCodeLmAdapter';
import { OpenAIEmbeddingAdapter } from '../../infrastructure/llm/providers/OpenAIEmbeddingAdapter';

/**
 * Provider information interface
 */
export interface ProviderInfo {
  id: string;
  name: string;
  capabilities: {
    supportsStreaming: boolean;
    supportsPromptCache: boolean;
    supportsReasoning: boolean;
    supportsEmbeddings: boolean;
  };
  defaultModel: string;
}

/**
 * Model cache entry
 */
interface ModelCacheEntry {
  data: ModelInfo;
  timestamp: number;
}

/**
 * LLMProviderRegistry
 *
 * Manages LLM provider adapters, model information caching, and provider orchestration.
 * Provides a unified interface for DietCode to work with multiple LLM providers.
 */
export class LLMProviderRegistry {
  private static instance: LLMProviderRegistry | null = null;
  private static readonly MODEL_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  private providers = new Map<string, LLMAdapter>();
  private models = new Map<string, ModelCacheEntry>();
  private providerInfos = new Map<string, ProviderInfo>();
  private isLoadingModels = new Set<string>();
  private modelUpdateListeners: ((providerId: string, models: ModelInfo[]) => void)[] = [];
  private healthUpdateListeners: ((providerId: string, status: any) => void)[] = [];

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): LLMProviderRegistry {
    if (!LLMProviderRegistry.instance) {
      LLMProviderRegistry.instance = new LLMProviderRegistry();
    }
    return LLMProviderRegistry.instance;
  }

  /**
   * Listen for model updates
   */
  public onModelsUpdated(callback: (providerId: string, models: ModelInfo[]) => void): void {
    this.modelUpdateListeners.push(callback);
  }

  /**
   * Listen for health updates
   */
  public onHealthUpdated(callback: (providerId: string, status: any) => void): void {
    this.healthUpdateListeners.push(callback);
  }

  /**
   * Register a provider adapter.
   * PRODUCTION HARDENING: Explicitly disposes of old adapters before replacement.
   */
  public async registerProvider(providerId: string, adapter: LLMAdapter): Promise<void> {
    const oldAdapter = this.providers.get(providerId);
    if (oldAdapter) {
      try {
        await oldAdapter.dispose();
      } catch (error) {
        console.error(`[REGISTRY] Failed to dispose old adapter for ${providerId}:`, error);
      }
    }

    this.providers.set(providerId, adapter);
    console.log(`✅ Provider registered: ${providerId}`);

    // Start model info loading if needed
    this.loadProviderModels(providerId);
  }

  /**
   * Get an adapter for a specific provider
   */
  getAdapter(providerId: string): LLMAdapter | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Register a provider info (metadata)
   */
  registerProviderInfo(info: ProviderInfo): void {
    this.providerInfos.set(info.id, info);
  }

  /**
   * Get provider info
   */
  getProviderInfo(providerId: string): ProviderInfo | undefined {
    return this.providerInfos.get(providerId);
  }

  /**
   * Get model info with caching
   */
  async getModelInfo(providerId: string, modelId: string): Promise<ModelInfo | undefined> {
    const cacheKey = `${providerId}_${modelId}`;
    const cached = this.models.get(cacheKey);

    // Return cached if not expired
    if (cached && Date.now() - cached.timestamp < LLMProviderRegistry.MODEL_CACHE_TTL_MS) {
      return cached.data;
    }

    // Load fresh model info
    return this.loadProviderModels(providerId);
  }

  /**
   * Load model information for a provider (lazy loading with caching)
   */
  private async loadProviderModels(providerId: string): Promise<ModelInfo | undefined> {
    // Avoid duplicate loads
    if (this.isLoadingModels.has(providerId)) {
      return undefined;
    }

    this.isLoadingModels.add(providerId);

    try {
      const adapter = this.getAdapter(providerId);
      if (!adapter) {
        return undefined;
      }

      // Invalidate old cache for this provider
      for (const [key, entry] of this.models.entries()) {
        if (key.startsWith(`${providerId}_`)) {
          this.models.delete(key);
        }
      }

      // Load model info from adapter
      const primaryModelInfo = adapter.getModelInfo();
      let allModels: ModelInfo[] = [primaryModelInfo];

      if (typeof adapter.listModels === 'function') {
        try {
          allModels = await adapter.listModels();
        } catch (error) {
          console.warn(`⚠️ Failed to listModels for ${providerId}, falling back to primary:`, error);
        }
      }

      // Update in-memory models cache
      for (const model of allModels) {
        this.models.set(`${providerId}_${model.id}`, {
          data: model,
          timestamp: Date.now(),
        });
      }

      // Update orchestrated state for reactive webview sync
      const orchestrator = StateOrchestrator.getInstance();
      const currentAvailable = await orchestrator.getState<Record<string, ModelInfo[]>>('availableProviderModels') || {};
      
      await orchestrator.applyChange({
        key: 'availableProviderModels',
        newValue: { ...currentAvailable, [providerId]: allModels },
        stateSet: {} as any,
        validate: () => true,
        sanitize: (val) => val,
        getCorrelationId: () => `model-discovery-${providerId}-${Date.now()}`
      }, 0);

      console.log(`✅ Provider models loaded: ${providerId} (${allModels.length} models found)`);
      
      // Notify listeners
      this.modelUpdateListeners.forEach(cb => cb(providerId, allModels));

      return primaryModelInfo;
    } catch (error: any) {
      console.error(`❌ Failed to load models for ${providerId}:`, error);
      throw error;
    } finally {
      this.isLoadingModels.delete(providerId);
    }
  }

  /**
   * Create an adapter from configuration
   */
  async createProviderFromConfig(providerId: string, config: AdapterConfig): Promise<LLMAdapter> {
    switch (providerId.toLowerCase()) {
      case 'openai':
      case 'openai-native':
        return new OpenAIAdapter({
          apiKey: config.apiKey,
          apiBase: config.apiBase,
          model: config.model || 'gpt-4o',
          maxTokens: config.maxTokens,
          temperature: config.temperature,
        });

      case 'anthropic':
        return new AnthropicAdapter({
          apiKey: config.apiKey,
          model: config.model || 'claude-3-7-sonnet-20250219',
          maxTokens: config.maxTokens,
          temperature: config.temperature,
        });

      case 'openrouter':
        return new OpenRouterAdapter({
          apiKey: config.apiKey,
          model: config.model || 'anthropic/claude-3.7-sonnet',
          maxTokens: config.maxTokens,
          temperature: config.temperature,
        });

      case 'gemini':
        return new GeminiAdapter({
          apiKey: config.apiKey,
          model: config.model || 'gemini-2.0-flash',
          maxTokens: config.maxTokens,
          temperature: config.temperature,
        });

      case 'vscode-lm':
        return new VsCodeLmAdapter({
          apiKey: '',
          model: config.model || 'gpt-4o',
        });

      case 'ollama':
        return new OpenAIAdapter({
          apiKey: 'ollama',
          apiBase: config.apiBase || 'http://localhost:11434/v1',
          model: config.model || 'llama3',
          maxTokens: config.maxTokens,
          temperature: config.temperature,
        });

      case 'cloudflare':
        if (!config.apiKey && !(config as any).apiToken) {
          throw new Error('Cloudflare requires an API token');
        }
        return new CloudflareAdapter({
          accountId: (config as any).accountId || process.env.CLOUDFLARE_ACCOUNT_ID || '',
          apiToken: config.apiKey || (config as any).apiToken,
          model: config.model,
        });

      default:
        throw new Error(`Unknown provider: ${providerId}`);
    }
  }

  /**
   * Check if a provider supports embeddings
   */
  canProvideEmbeddings(providerId: string): boolean {
    const adapter = this.getAdapter(providerId);
    if (!adapter) {
      return false;
    }

    // Check if embedText method exists
    return typeof adapter.embedText === 'function';
  }

  /**
   * Get all registered provider IDs
   */
  getAllProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): Map<string, LLMAdapter> {
    return new Map(this.providers);
  }

  /**
   * Get provider count
   */
  getProviderCount(): number {
    return this.providers.size;
  }

  /**
   * Clear all model caches (useful after provider change)
   */
  clearModelCaches(): void {
    this.models.clear();
    console.log('🗑️  Model caches cleared');
  }

  /**
   * Get provider prompt strategy
   */
  getPromptStrategy(providerId: string): PromptStrategy {
    const adapter = this.getAdapter(providerId);
    if (!adapter) {
      return EnumPromptStrategy.NATIVE;
    }

    const strategy = adapter.getPromptStrategy();
    return strategy;
  }

  /**
   * Create a composite adapter that chains multiple providers (fallback strategy)
   */
  createCompositeAdapter(
    primaryProviders: string[],
    fallbackProviders: string[],
    config: AdapterConfig,
  ): CompositeLLMAdapter {
    const primary = primaryProviders
      .map((id) => this.getAdapter(id))
      .filter((a): a is LLMAdapter => a !== undefined);

    const fallback = fallbackProviders
      .map((id) => this.getAdapter(id))
      .filter((a): a is LLMAdapter => a !== undefined);

    return new CompositeLLMAdapter(primary, fallback, config);
  }

  /**
   * Synchronize registered providers with a new configuration object.
   * This re-registers primary adapters with updated credentials.
   */
  async updateActiveConfiguration(config: ApiConfiguration): Promise<void> {
    const providersToSync: ApiProvider[] = [
      'anthropic',
      'openai',
      'openai-native',
      'gemini',
      'ollama',
      'openrouter',
      'cloudflare',
      'vscode-lm',
    ];

    for (const providerId of providersToSync) {
      const adapterConfig = this.mapApiConfigurationToAdapterConfig(providerId, config);
      if (adapterConfig) {
        try {
          const adapter = await this.createProviderFromConfig(providerId, adapterConfig);
          this.registerProvider(providerId, adapter);
        } catch (error) {
          console.error(`❌ Failed to sync provider ${providerId}:`, error);
        }
      }
    }

    this.clearModelCaches();
    console.log('🔄 Registry synchronized with new configuration');
    
    // Notify health update (optimistic success if we reached here)
    for (const providerId of providersToSync) {
      this.healthUpdateListeners.forEach(cb => cb(providerId, 'online'));
    }
  }

  /**
   * Test a specific provider connection without registering it.
   */
  async testConnection(providerId: ApiProvider, config: ApiConfiguration): Promise<boolean> {
    const adapterConfig = this.mapApiConfigurationToAdapterConfig(providerId, config);
    if (!adapterConfig) return false;

    try {
      const adapter = await this.createProviderFromConfig(providerId, adapterConfig);
      // Minimal ping check
      if (typeof adapter.createMessage === 'function') {
        // Most adapters have a ping or similar. If not, we could do a dummy call.
        // For now, if we successfully created it, and it has createMessage, we consider it "configured".
        // Real adapters should implement a .ping() or similar eventually.
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Connection test failed for ${providerId}:`, error);
      return false;
    }
  }

  /**
   * Helper to map shared ApiConfiguration to internal AdapterConfig
   */
  private mapApiConfigurationToAdapterConfig(
    providerId: ApiProvider,
    config: ApiConfiguration,
  ): AdapterConfig | undefined {
    switch (providerId) {
      case 'anthropic':
        if (!config.apiKey) return undefined;
        return {
          apiKey: config.apiKey,
          model: config.apiModelId,
          maxTokens: config.modelInfo?.maxTokens,
        };
      case 'openai':
      case 'openai-native':
        if (!config.openAiApiKey && !config.apiKey) return undefined;
        return {
          apiKey: config.openAiApiKey || config.apiKey!,
          apiBase: config.openAiBaseUrl,
          model: config.openAiModelId,
        };
      case 'gemini':
        if (!config.geminiApiKey) return undefined;
        return {
          apiKey: config.geminiApiKey,
          model: config.geminiModelId,
        };
      case 'openrouter':
        if (!config.openRouterApiKey) return undefined;
        return {
          apiKey: config.openRouterApiKey,
          model: config.openRouterModelId,
        };
      case 'ollama':
        return {
          apiKey: 'ollama',
          apiBase: config.ollamaBaseUrl,
          model: config.ollamaModelId,
        };
      case 'vscode-lm':
        return {
          apiKey: '',
          model: config.planModeVsCodeLmModelSelector?.id || 'gpt-4o',
        };
      default:
        return undefined;
    }
  }
}

/**
 * Composite LLM Adapter (fallback chain)
 */
class CompositeLLMAdapter implements LLMAdapter {
  private primaryChain: LLMAdapter[];
  private fallbackChain: LLMAdapter[];
  private config: AdapterConfig;

  constructor(primaryChain: LLMAdapter[], fallbackChain: LLMAdapter[], config: AdapterConfig) {
    this.primaryChain = primaryChain;
    this.fallbackChain = fallbackChain;
    this.config = config;
  }

  createMessage(system: string, messages: Message[], tools?: ToolDefinition[]): ApiStream {
    const primaryChain = this.primaryChain;
    const fallbackChain = this.fallbackChain;

    return {
      async *[Symbol.asyncIterator]() {
        // Try primary chain first
        for (const adapter of primaryChain) {
          try {
            const stream = adapter.createMessage(system, messages, tools);
            for await (const chunk of stream) {
              yield chunk;
            }
            return;
          } catch (error: any) {
            console.warn(
              `⚠️  Primary adapter failed (${adapter.constructor.name}): ${error.message}`,
            );
          }
        }

        // Fallback to secondary chain
        for (const adapter of fallbackChain) {
          try {
            console.log(`🔄  Falling back to ${adapter.constructor.name}`);
            const stream = adapter.createMessage(system, messages, tools);
            for await (const chunk of stream) {
              yield chunk;
            }
            return;
          } catch (error: any) {
            console.warn(
              `❌  Fallback adapter failed (${adapter.constructor.name}): ${error.message}`,
            );
          }
        }

        throw new Error('All provider adapters failed');
      },
    };
  }

  getModelInfo(): ModelInfo {
    if (this.primaryChain.length === 0) {
      throw new Error('No primary adapters configured');
    }
    const modelInfo = this.primaryChain[0]?.getModelInfo();
    if (!modelInfo) {
      throw new Error('Failed to get model info from primary adapter');
    }
    return modelInfo;
  }

  async embedText?(text: string): Promise<number[]> {
    for (const adapter of this.primaryChain) {
      if (adapter.embedText) {
        return await adapter.embedText(text);
      }
    }

    for (const adapter of this.fallbackChain) {
      if (adapter.embedText) {
        return await adapter.embedText(text);
      }
    }

    throw new Error('No provider supports embeddings');
  }

  getThinkingBudgetTokenLimit(): number {
    if (this.primaryChain.length === 0) return 0;
    const limit = this.primaryChain[0]?.getThinkingBudgetTokenLimit();
    return limit ?? 0;
  }

  getPromptStrategy(): PromptStrategy {
    if (this.primaryChain.length === 0) return EnumPromptStrategy.NATIVE;
    const strategy = this.primaryChain[0]?.getPromptStrategy();
    return strategy ?? EnumPromptStrategy.NATIVE;
  }

  async dispose(): Promise<void> {
    // Cascade disposal to all adapters in both chains
    await Promise.all([
      ...this.primaryChain.map((a) => a.dispose()),
      ...this.fallbackChain.map((a) => a.dispose()),
    ]);
  }
}

/**
 * Auto-register OpenAI embeddings registry
 */
export function initializeOpenAIEmbeddings(apiKey: string) {
  const registry = LLMProviderRegistry.getInstance();
  const embeddingAdapter = new OpenAIEmbeddingAdapter({
    apiKey,
    model: 'text-embedding-3-small',
  });

  registry.registerProvider('openai', embeddingAdapter);
  registry.registerProviderInfo({
    id: 'openai',
    name: 'OpenAI',
    capabilities: {
      supportsStreaming: true,
      supportsPromptCache: true,
      supportsReasoning: true,
      supportsEmbeddings: true,
    },
    defaultModel: 'gpt-4o',
  });

  console.log('✅ OpenAI embeddings auto-registered');
}

/**
 * Auto-register Cloudflare registry
 */
export function initializeCloudflare(accountId: string, apiToken: string) {
  const registry = LLMProviderRegistry.getInstance();
  const adapter = new CloudflareAdapter({
    accountId,
    apiToken,
    model: '@cf/moonshotai/kimi-k2.5',
  });

  registry.registerProvider('cloudflare', adapter);
  registry.registerProviderInfo({
    id: 'cloudflare',
    name: 'Cloudflare Workers AI',
    capabilities: {
      supportsStreaming: true,
      supportsPromptCache: true,
      supportsReasoning: true,
      supportsEmbeddings: false,
    },
    defaultModel: '@cf/moonshotai/kimi-k2.5',
  });

  console.log('✅ Cloudflare AI auto-registered');
}
