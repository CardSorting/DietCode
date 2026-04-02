/**
 * [LAYER: CORE]
 * Principle: Orchestrate domain and infrastructure adapters
 * Prework Status: Not applicable (new file)
 * 
 * Central registry for LLM provider adapters, managing 40+ provider support
 * with dynamic model discovery, caching, and provider-specific strategies.
 */

import type {
  LLMAdapter,
  AdapterConfig,
  ModelInfo,
  PromptStrategy,
  Message,
  ApiStream,
} from '../../domain/agent/LLMProviderAdapter';
import type { ToolDefinition } from '../../domain/agent/ToolDefinition';
import { PromptStrategy as EnumPromptStrategy } from '../../domain/agent/LLMProviderAdapter';
import { OpenAIEmbeddingAdapter } from '../../infrastructure/llm/OpenAIEmbeddingAdapter';

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
   * Register a provider adapter
   */
  registerProvider(providerId: string, adapter: LLMAdapter): void {
    if (this.providers.has(providerId)) {
      console.warn(`⚠️  Overriding existing provider: ${providerId}`);
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
  async getModelInfo(
    providerId: string,
    modelId: string
  ): Promise<ModelInfo | undefined> {
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
      const modelInfo = adapter.getModelInfo();
      
      if (modelInfo) {
        this.models.set(`${providerId}_${modelInfo.id}`, {
          data: modelInfo,
          timestamp: Date.now(),
        });
        
        console.log(`✅ Provider models loaded: ${providerId} (${modelInfo.name})`);
      }

      return modelInfo;
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
  async createProviderFromConfig(
    providerId: string,
    config: AdapterConfig
  ): Promise<LLMAdapter> {
    switch (providerId.toLowerCase()) {
      case 'openai':
        // Note: This would require OpenAIAdapter implementation
        // For now, returning stub
        throw new Error(`OpenAI adapter not implemented yet. Please implement src/infrastructure/llm/OpenAIAdapter.ts`);

      case 'anthropic':
        // Note: Would require AnthropicAdapter implementation
        throw new Error(`Anthropic adapter not implemented yet. Please implement src/infrastructure/llm/AnthropicAdapter.ts`);

      case 'openrouter':
        // Note: Would require OpenRouterAdapter implementation
        throw new Error(`OpenRouter adapter not implemented yet. Please implement src/infrastructure/llm/OpenRouterAdapter.ts`);

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
    config: AdapterConfig
  ): CompositeLLMAdapter {
    return new CompositeLLMAdapter(
      primaryProviders.map(id => this.getAdapter(id)!),
      fallbackProviders.map(id => this.getAdapter(id)!),
      config
    );
  }
}

/**
 * Composite LLM Adapter (fallback chain)
 */
class CompositeLLMAdapter implements LLMAdapter {
  private primaryChain: LLMAdapter[];
  private fallbackChain: LLMAdapter[];
  private config: AdapterConfig;

  constructor(
    primaryChain: LLMAdapter[],
    fallbackChain: LLMAdapter[],
    config: AdapterConfig
  ) {
    this.primaryChain = primaryChain;
    this.fallbackChain = fallbackChain;
    this.config = config;
  }

  createMessage(
    system: string,
    messages: Message[],
    tools?: ToolDefinition[]
  ): ApiStream {
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
            console.warn(`⚠️  Primary adapter failed (${adapter.constructor.name}): ${error.message}`);
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
            console.warn(`❌  Fallback adapter failed (${adapter.constructor.name}): ${error.message}`);
          }
        }

        throw new Error('All provider adapters failed');
      }
    };
  }

  getModelInfo(): ModelInfo {
    if (this.primaryChain.length === 0) {
      throw new Error('No primary adapters configured');
    }
    return this.primaryChain[0]!.getModelInfo();
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
    return this.primaryChain[0]!.getThinkingBudgetTokenLimit();
  }

  getPromptStrategy(): PromptStrategy {
    if (this.primaryChain.length === 0) return EnumPromptStrategy.NATIVE;
    return this.primaryChain[0]!.getPromptStrategy();
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
    defaultModel: 'gpt-4o'
  });

  console.log('✅ OpenAI embeddings auto-registered');
}