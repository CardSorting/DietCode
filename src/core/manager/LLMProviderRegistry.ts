/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { ApiConfiguration, ApiProvider } from '../../shared/api';
import type { LLMAdapter, ModelInfo, PromptStrategy } from '../../domain/agent/LLMProviderAdapter';
import { PromptStrategy as EnumPromptStrategy } from '../../domain/agent/LLMProviderAdapter';
import { AdapterFactory } from './registry/AdapterFactory';
import { ModelCache } from './registry/ModelCache';

/**
 * [LAYER: CORE / MANAGER]
 * Orchestrator for LLM provider adapters.
 * 
 * DESIGN: Delegates specialized concerns (Factory, Cache) to sub-modules
 * while providing a unified interface for model management and adapter lifecycle.
 */
export class LLMProviderRegistry {
  private static instance: LLMProviderRegistry;
  private providers = new Map<string, LLMAdapter>();
  private factory = new AdapterFactory();
  private cache = new ModelCache();
  
  private isLoadingModels = new Set<string>();
  private modelUpdateListeners = new Set<(providerId: string, models: ModelInfo[]) => void>();
  private healthUpdateListeners = new Set<(providerId: string, status: 'online' | 'offline' | 'error') => void>();

  private constructor() {}

  public static getInstance(): LLMProviderRegistry {
    if (!LLMProviderRegistry.instance) {
      LLMProviderRegistry.instance = new LLMProviderRegistry();
    }
    return LLMProviderRegistry.instance;
  }

  public registerProvider(id: string, adapter: LLMAdapter): void {
    this.providers.set(id, adapter);
    console.log(`🔌 Provider registered: ${id}`);
  }

  public getAdapter(id: string): LLMAdapter | undefined {
    return this.providers.get(id);
  }

  /**
   * Discover and cache models for a provider
   */
  public async loadProviderModels(providerId: string): Promise<ModelInfo> {
    const adapter = this.getAdapter(providerId);
    if (!adapter) throw new Error(`Provider ${providerId} not registered`);

    if (this.isLoadingModels.has(providerId)) {
        // Return existing primary if already loading
        return adapter.getModelInfo();
    }

    this.isLoadingModels.add(providerId);
    try {
      const primaryModelInfo = adapter.getModelInfo();
      let allModels: ModelInfo[] = [primaryModelInfo];

      if (typeof adapter.listModels === 'function') {
        try {
          allModels = await adapter.listModels();
        } catch (error) {
          console.warn(`⚠️ Failed to listModels for ${providerId}:`, error);
        }
      }

      // Update cache and sync to state
      for (const model of allModels) {
        this.cache.set(`${providerId}_${model.id}`, { data: model, timestamp: Date.now() });
      }
      await this.cache.syncToState(providerId, allModels);

      for (const cb of this.modelUpdateListeners) {
        cb(providerId, allModels);
      }
      return primaryModelInfo;
    } finally {
      this.isLoadingModels.delete(providerId);
    }
  }

  /**
   * Sync configuration across all active providers (Gemini only)
   */
  public async updateActiveConfiguration(config: ApiConfiguration): Promise<void> {
    const providerId: ApiProvider = 'gemini';
    const adapterConfig = this.factory.mapConfigToAdapter(providerId, config);
    
    if (adapterConfig) {
      try {
        const adapter = await this.factory.createAdapter(providerId, adapterConfig);
        this.registerProvider(providerId, adapter);
        for (const cb of this.healthUpdateListeners) {
          cb(providerId, 'online');
        }
      } catch (error) {
        console.error(`❌ Failed to sync provider ${providerId}:`, error);
      }
    }

    this.cache.clear();
    console.log('🔄 Registry synchronized with Gemini configuration');
  }

  public getAllProviders(): Map<string, LLMAdapter> {
    return new Map(this.providers);
  }

  public getPromptStrategy(providerId: string): PromptStrategy {
    const adapter = this.getAdapter(providerId);
    return adapter ? adapter.getPromptStrategy() : EnumPromptStrategy.NATIVE;
  }

  public onModelUpdate(callback: (providerId: string, models: ModelInfo[]) => void) {
    this.modelUpdateListeners.add(callback);
    return () => this.modelUpdateListeners.delete(callback);
  }

  public onHealthUpdate(callback: (providerId: string, status: 'online' | 'offline' | 'error') => void) {
    this.healthUpdateListeners.add(callback);
    return () => this.healthUpdateListeners.delete(callback);
  }
}
